import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { ProfileService } from "../../../src/services/profile.service";
import { resolvedConfig } from "../../support/config";
import { FakePersonalInfoRepo } from "../../support/fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "../../support/fakes/profile.fake";
import { createTestApp } from "../../support/test-app";

const full = {
  ...profileInput,
  fullName: "Ada Lovelace",
  headline: "Analyst",
  masterCv: "# Experience\nBuilt engines",
};

function setup(seed: boolean) {
  const repo = new FakeProfileRepo();
  if (seed) repo.row = { ...full, id: 1, updatedAt: new Date() };
  const config = resolvedConfig();
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), config.piiEncryptionKey);
  const profile = new ProfileService(repo);
  const { app } = createTestApp({ services: { profile, personalInfo } });
  const cookie = signSession({ scope: "admin" }, config.sessionSecret, 60).then(
    (t) => `curr_admin=${t}`,
  );
  const post = async (fields: Record<string, string>) =>
    app.request("/admin/profile", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: await cookie },
      body: new URLSearchParams(fields).toString(),
    });
  const get = async () => app.request("/admin/profile", { headers: { cookie: await cookie } });
  return { repo, personalInfo, post, get };
}

describe("admin profile", () => {
  it("prefills the form", async () => {
    const { get } = setup(true);
    const html = await (await get()).text();
    for (const name of [
      "fullName",
      "headline",
      "masterCv",
      "publicSystemPrompt",
      "recruiterSystemPrompt",
      "tailorSystemPrompt",
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain('value="Ada Lovelace"');
    expect(html).toContain("Built engines");
    expect(html).toContain(">p</textarea>");
    expect(html).toContain(">r</textarea>");
    expect(html).toContain(">t</textarea>");
  });

  it("saves valid fields and shows Saved", async () => {
    const { post, repo } = setup(true);
    const res = await post({ ...full, headline: "Mathematician" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Saved");
    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0]?.headline).toBe("Mathematician");
  });

  it("rejects an empty prompt without saving", async () => {
    const { post, repo } = setup(true);
    const res = await post({ ...full, recruiterSystemPrompt: "  " });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Recruiter system prompt is required");
    expect(html).toContain("Built engines");
    expect(repo.upserts).toHaveLength(0);
  });

  it("rejects a master cv containing a personal info value", async () => {
    const { post, repo, personalInfo } = setup(true);
    await personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "public",
    });
    const res = await post({ ...full, masterCv: "Reach me: Ada@Example.com" });
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
    expect((await post({ ...full, masterCv: "Lives in Porto" })).status).toBe(200);
    await personalInfo.update("CITY", { value: "Porto" });
    const res = await post({ ...full, masterCv: "Lives in Porto" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Your City is in the body");
    expect(repo.upserts).toHaveLength(1);
  });
});
