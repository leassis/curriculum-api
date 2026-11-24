import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { CareerService } from "../../../src/services/career.service";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { ProfileService } from "../../../src/services/profile.service";
import { resolvedConfig } from "../../support/config";
import { FakeCareerRepo } from "../../support/fakes/career.fake";
import { FakePersonalInfoRepo } from "../../support/fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "../../support/fakes/profile.fake";
import { createTestApp } from "../../support/test-app";

const full = {
  ...profileInput,
  fullName: "Ada Lovelace",
  headline: "Analyst",
  summary: "Built engines",
};

function setup(seed: boolean) {
  const repo = new FakeProfileRepo();
  if (seed)
    repo.row = {
      ...full,
      additionalInformation: "",
      lookingForwardNext: "",
      id: 1,
      updatedAt: new Date(),
    };
  const config = resolvedConfig();
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), config.piiEncryptionKey);
  const profile = new ProfileService(repo);
  const { services } = createTestApp();
  const career = new CareerService(new FakeCareerRepo(), personalInfo, profile, services.llm);
  const { app } = createTestApp({ services: { profile, personalInfo, career } });
  const cookie = signSession({ scope: "admin" }, config.sessionSecret, 60).then(
    (t) => `curr_admin=${t}`,
  );
  const post = async (fields: Record<string, string>) =>
    app.request("/admin/profile", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: await cookie },
      body: new URLSearchParams(fields).toString(),
    });
  const postHtmx = async (fields: Record<string, string>) =>
    app.request("/admin/profile", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: await cookie,
        "HX-Request": "true",
      },
      body: new URLSearchParams(fields).toString(),
    });
  const get = async (query = "") =>
    app.request(`/admin/profile${query}`, { headers: { cookie: await cookie } });
  return { repo, personalInfo, post, postHtmx, get };
}

describe("admin profile", () => {
  const careerFields = ["fullName", "headline", "summary"];
  const promptFields = ["publicSystemPrompt", "recruiterSystemPrompt", "tailorSystemPrompt"];

  it("shows the career tab by default, without the prompts", async () => {
    const { get } = setup(true);
    const html = await (await get()).text();
    for (const name of careerFields) expect(html).toContain(`name="${name}"`);
    for (const name of promptFields) expect(html).not.toContain(`name="${name}"`);
    expect(html).toContain('value="Ada Lovelace"');
    expect(html).toContain("Built engines");
    expect(html).toContain('id="career-library"');
    expect(html).toMatch(/href="\/admin\/profile\?tab=career" aria-selected="true"/);
    expect(html).toMatch(/href="\/admin\/profile\?tab=ai" aria-selected="false"/);
    expect(html).toContain('name="tab" value="career"');
  });

  it("shows the prompts on the AI tab, without career content", async () => {
    const { get } = setup(true);
    const html = await (await get("?tab=ai")).text();
    for (const name of promptFields) expect(html).toContain(`name="${name}"`);
    for (const name of careerFields) expect(html).not.toContain(`name="${name}"`);
    expect(html).toContain(">p</textarea>");
    expect(html).toContain(">r</textarea>");
    expect(html).toContain(">t</textarea>");
    expect(html).not.toContain('id="career-library"');
    expect(html).not.toContain("career.js");
    expect(html).toMatch(/href="\/admin\/profile\?tab=ai" aria-selected="true"/);
  });

  it("saves only the career fields and keeps the stored prompts", async () => {
    const { post, get, repo } = setup(true);
    const res = await post({
      tab: "career",
      fullName: "Ada",
      headline: "Mathematician",
      summary: "Notes on engines",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/admin/profile?tab=career&saved=1");
    const html = await (await get("?tab=career&saved=1")).text();
    expect(html).toContain("Saved");
    expect(html).toContain('data-toast="success"');
    expect(html).toMatch(/tab=career" aria-selected="true"/);
    expect(await (await get("?tab=career")).text()).not.toContain('data-toast="success"');
    expect(repo.upserts).toHaveLength(1);
    expect(repo.row).toMatchObject({
      headline: "Mathematician",
      summary: "Notes on engines",
      publicSystemPrompt: full.publicSystemPrompt,
      recruiterSystemPrompt: full.recruiterSystemPrompt,
      tailorSystemPrompt: full.tailorSystemPrompt,
    });
  });

  it("answers an htmx save with only the form fragment and the Saved marker", async () => {
    const { postHtmx, repo } = setup(true);
    const res = await postHtmx({ ...full, tab: "career", headline: "Mathematician" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("<html");
    expect(html).toContain('id="profile-form"');
    expect(html).toContain('hx-target="#profile-form"');
    expect(html).toMatch(/role="status"[^>]*data-toast="success"/);
    expect(html).toContain('value="Mathematician"');
    expect(repo.row).toMatchObject({ headline: "Mathematician" });
  });

  it("answers an htmx rejection with a 400 form fragment keeping the entered values", async () => {
    const { postHtmx, repo } = setup(true);
    const res = await postHtmx({
      tab: "ai",
      publicSystemPrompt: "",
      recruiterSystemPrompt: "Kept",
      tailorSystemPrompt: "t2",
    });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).not.toContain("<html");
    expect(html).toContain('id="profile-form"');
    expect(html).toMatch(/role="alert"[^>]*data-toast="error"/);
    expect(html).toContain(">Kept</textarea>");
    expect(html).not.toContain('data-toast="success"');
    expect(repo.upserts).toHaveLength(0);
  });

  it("saves only the prompts and keeps the career content", async () => {
    const { post, get, repo } = setup(true);
    const res = await post({
      tab: "ai",
      publicSystemPrompt: "p2",
      recruiterSystemPrompt: "r2",
      tailorSystemPrompt: "t2",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/admin/profile?tab=ai&saved=1");
    expect(await (await get("?tab=ai&saved=1")).text()).toMatch(/tab=ai" aria-selected="true"/);
    expect(repo.row).toMatchObject({
      fullName: "Ada Lovelace",
      headline: "Analyst",
      summary: "Built engines",
      publicSystemPrompt: "p2",
      recruiterSystemPrompt: "r2",
      tailorSystemPrompt: "t2",
    });
  });

  it("saves valid fields and shows Saved", async () => {
    const { post, get, repo } = setup(true);
    const res = await post({ ...full, headline: "Mathematician" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("saved=1");
    expect(await (await get("?saved=1")).text()).toContain("Saved");
    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0]?.headline).toBe("Mathematician");
  });

  it("rejects an empty prompt without saving", async () => {
    const { post, repo } = setup(true);
    const res = await post({ ...full, recruiterSystemPrompt: "  " });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Recruiter system prompt is required");
    expect(html).toMatch(/tab=ai" aria-selected="true"/);
    expect(html).toContain('name="recruiterSystemPrompt"');
    expect(repo.upserts).toHaveLength(0);
  });

  it("rejects a summary containing a personal info value", async () => {
    const { post, repo, personalInfo } = setup(true);
    await personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "public",
    });
    const res = await post({ ...full, summary: "Reach me: Ada@Example.com" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Your Email is in the body — keep contact data in Personal info");
    expect(html).not.toContain("ada@example.com");
    expect(repo.upserts).toHaveLength(0);
  });

  it("uses the new personal info value on the next save", async () => {
    const { post, repo, personalInfo } = setup(true);
    await personalInfo.create({
      key: "CITY",
      label: "City",
      value: "Lisbon",
      visibility: "public",
    });
    expect((await post({ ...full, summary: "Lives in Porto" })).status).toBe(303);
    await personalInfo.update("CITY", { value: "Porto" });
    const res = await post({ ...full, summary: "Lives in Porto" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Your City is in the body");
    expect(repo.upserts).toHaveLength(1);
  });
});
