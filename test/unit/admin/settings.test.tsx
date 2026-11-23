import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { SettingsService } from "../../../src/services/settings.service";
import { careerSetup } from "../../support/career-service";
import { resolvedConfig } from "../../support/config";
import { FakeSettingsRepo } from "../../support/fakes/settings.fake";
import { createTestApp } from "../../support/test-app";

const KEYS = [
  "model.public",
  "model.tailor",
  "model.recruiter",
  "model.import",
  "limits.publicQuestionsPerIpPerDay",
  "limits.recruiterQuestionsDefault",
  "limits.publicMaxOutputTokens",
  "limits.recruiterMaxOutputTokens",
  "limits.maxQuestionChars",
  "limits.maxHistoryMessages",
  "limits.sessionTtlMinutes",
  "print.pageSize",
];

function setup(rows: Record<string, string> = {}) {
  const config = resolvedConfig({ models: { public: "cfg/public" } });
  const repo = new FakeSettingsRepo(rows);
  const settings = new SettingsService(repo, config);
  const { app } = createTestApp({
    config: { models: { public: "cfg/public" } },
    services: { settings },
  });
  const cookie = signSession({ scope: "admin" }, config.sessionSecret, 60).then(
    (t) => `curr_admin=${t}`,
  );
  const post = async (fields: Record<string, string>) =>
    app.request("/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: await cookie },
      body: new URLSearchParams(fields).toString(),
    });
  const get = async () => app.request("/admin/settings", { headers: { cookie: await cookie } });
  return { repo, post, get };
}

describe("admin settings", () => {
  it("renders every key with override or fallback", async () => {
    const { get } = setup({ "model.tailor": "ovr/tailor", "limits.maxQuestionChars": "250" });
    const html = await (await get()).text();
    for (const key of KEYS) expect(html).toContain(`name="${key}"`);
    expect(html).toContain('value="ovr/tailor"');
    expect(html).toContain('value="250"');
    expect(html).toContain('placeholder="cfg/public"');
    expect(html).toContain('placeholder="5"');
    expect(html).toContain('<option value="A4"');
    expect(html).toContain('<option value="Letter"');
  });

  it("saves each key and shows Saved", async () => {
    const { post, repo } = setup({ "model.tailor": "old/tailor" });
    const res = await post({
      "model.public": "x/y",
      "model.tailor": "",
      "limits.maxHistoryMessages": "7",
      "print.pageSize": "Letter",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Saved");
    expect(repo.rows).toEqual({
      "model.public": "x/y",
      "limits.maxHistoryMessages": "7",
      "print.pageSize": "Letter",
    });
  });

  it("rejects an invalid limit and saves nothing", async () => {
    const { post, repo } = setup();
    for (const bad of ["0", "-3", "1.5", "abc"]) {
      const res = await post({ "model.public": "x/y", "limits.maxQuestionChars": bad });
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("limits.maxQuestionChars");
    }
    expect(repo.rows).toEqual({});
  });
});

describe("admin settings", () => {
  it("import model is shown and used by the next convert", async () => {
    const s = careerSetup({ mock: { text: "## Experience" } });
    const { app } = createTestApp({
      config: s.config,
      services: {
        settings: s.settings,
        career: s.career,
        profile: s.profile,
        personalInfo: s.personalInfo,
        llm: s.llm,
      },
    });
    const cookie = `curr_admin=${await signSession({ scope: "admin" }, s.config.sessionSecret, 60)}`;
    const send = (path: string, fields?: Record<string, string>) =>
      app.request(
        path,
        fields
          ? {
              method: "POST",
              headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(fields).toString(),
            }
          : { headers: { cookie } },
      );

    const page = await (await send("/admin/settings")).text();
    expect(page).toMatch(/<label[^>]*for="model\.import"[^>]*>\s*Import model/);
    expect(page).toContain('placeholder="vendor/import"');

    await send("/admin/profile/import", { text: "Worked at Acme" });
    expect(s.calls.at(-1)?.modelId).toBe("vendor/import");

    const saved = await send("/admin/settings", { "model.import": "ovr/import" });
    expect(saved.status).toBe(200);
    expect(await (await send("/admin/settings")).text()).toContain('value="ovr/import"');

    await send("/admin/profile/import", { text: "Worked at Acme" });
    expect(s.calls.at(-1)?.modelId).toBe("ovr/import");
  });
});
