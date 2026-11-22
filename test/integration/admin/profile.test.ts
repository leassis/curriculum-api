import { beforeEach, describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const form = {
  fullName: "Ada",
  headline: "Analyst",
  masterCv: "# Experience\nBuilt engines",
  publicSystemPrompt: "pub",
  recruiterSystemPrompt: "rec",
  tailorSystemPrompt: "tail",
};

async function setup() {
  const { app, services } = createTestApp();
  const token = await signSession({ scope: "admin" }, resolvedConfig().sessionSecret, 60);
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    cookie: `curr_admin=${token}`,
  };
  const post = (fields: Record<string, string>) =>
    app.request("/admin/profile", {
      method: "POST",
      headers,
      body: new URLSearchParams(fields).toString(),
    });
  const get = () => app.request("/admin/profile", { headers });
  return { services, post, get };
}

describe("admin profile with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("creates profile row 1 on first save", async () => {
    const { services, post, get } = await setup();
    const empty = await get();
    expect(empty.status).toBe(200);
    expect(await empty.text()).toContain('name="fullName"');
    expect((await post(form)).status).toBe(200);
    expect((await services.profile.get()).fullName).toBe("Ada");
  });

  it("serves the saved master cv and prompts to the next read", async () => {
    const { services, post } = await setup();
    await post(form);
    await post({ ...form, masterCv: "# New CV", recruiterSystemPrompt: "new rec" });
    const profile = await services.profile.get();
    expect(profile.masterCv).toBe("# New CV");
    expect(profile.recruiterSystemPrompt).toBe("new rec");
    expect(profile.publicSystemPrompt).toBe("pub");
  });

  it("keeps the profile unchanged when the pii guard rejects", async () => {
    const { services, post } = await setup();
    await post(form);
    await services.personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "public",
    });
    const res = await post({ ...form, masterCv: "mail me at ada@example.com" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(
      "Your Email is in the body — keep contact data in Personal info",
    );
    expect((await services.profile.get()).masterCv).toBe(form.masterCv);
  });
});
