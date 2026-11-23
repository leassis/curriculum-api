import { beforeEach, describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const form = {
  fullName: "Ada",
  headline: "Analyst",
  summary: "Built engines",
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

describe("admin profile routes", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("stores headline and summary", async () => {
    const { services, post } = await setup();
    const res = await post({
      ...form,
      headline: "Staff Engineer",
      summary: "Ten years of platform work.",
    });
    expect(res.status).toBe(200);
    const stored = await services.profile.get();
    expect(stored.headline).toBe("Staff Engineer");
    expect(stored.summary).toBe("Ten years of platform work.");
  });
});

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

  it("serves the saved summary and prompts to the next read", async () => {
    const { services, post } = await setup();
    await post(form);
    await post({ ...form, summary: "New summary", recruiterSystemPrompt: "new rec" });
    const profile = await services.profile.get();
    expect(profile.summary).toBe("New summary");
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
    const res = await post({ ...form, summary: "mail me at ada@example.com" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(
      "Your Email is in the body — keep contact data in Personal info",
    );
    expect((await services.profile.get()).summary).toBe(form.summary);
  });
});

describe("admin profile career routes", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  async function career() {
    const { services } = createTestApp();
    const token = await signSession({ scope: "admin" }, resolvedConfig().sessionSecret, 60);
    const send = (method: string, path: string, fields: Record<string, string> = {}) =>
      createTestApp().app.request(path, {
        method,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: `curr_admin=${token}`,
        },
        body:
          method === "GET" || method === "DELETE"
            ? undefined
            : new URLSearchParams(fields).toString(),
      });
    return { services, send };
  }

  it("saves a new item and re-renders its card", async () => {
    const { services, send } = await career();
    const res = await send("POST", "/admin/profile/items", {
      kind: "experience",
      title: "Staff Engineer",
      organisation: "Globex",
      location: "Remote",
      startYear: "2020",
      startMonth: "1",
      current: "on",
      details: "Led the team.\n- Cut latency",
      stack: "TypeScript, Postgres",
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Globex · Remote · Jan 2020 – Present");
    expect(html).toContain('<span class="badge">1</span>');
    const [stored] = (await services.career.library()).items;
    expect(stored).toMatchObject({
      kind: "experience",
      title: "Staff Engineer",
      current: true,
      text: "Led the team.",
      bullets: ["Cut latency"],
      skills: ["TypeScript", "Postgres"],
    });
  });

  it("stores a move and re-renders the card", async () => {
    const { services, send } = await career();
    for (const title of ["First", "Second"]) {
      await send("POST", "/admin/profile/items", {
        kind: "course",
        title,
        organisation: "School",
      });
    }
    const [first] = (await services.career.library()).items;
    const res = await send("POST", `/admin/profile/items/${first?.id}/move`, { direction: "down" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.indexOf("Second")).toBeLessThan(html.indexOf("First"));
    expect((await services.career.library()).items.map((i) => i.title)).toEqual([
      "Second",
      "First",
    ]);
  });

  it("deletes an item and persists a markdown save", async () => {
    const { services, send } = await career();
    await send("POST", "/admin/profile/items", {
      kind: "language",
      title: "English",
      level: "Fluent",
    });
    const [english] = (await services.career.library()).items;
    expect((await send("DELETE", `/admin/profile/items/${english?.id}`)).status).toBe(200);
    expect((await services.career.library()).items).toEqual([]);
    const markdown = "## Experience\n\n### Founder\n*Own Co · 2018 – Present*\n";
    const res = await send("PUT", "/admin/profile/markdown", { markdown });
    expect(res.status).toBe(200);
    expect((await services.career.library()).items.map((i) => i.title)).toEqual(["Founder"]);
  });

  it("edits an item keeping its id", async () => {
    const { services, send } = await career();
    await send("POST", "/admin/profile/items", {
      kind: "language",
      title: "English",
      level: "Fluent",
    });
    const [english] = (await services.career.library()).items;
    const res = await send("PUT", `/admin/profile/items/${english?.id}`, {
      title: "English",
      level: "Native",
    });
    expect(res.status).toBe(200);
    expect((await services.career.library()).items).toEqual([{ ...english, level: "Native" }]);
  });
});
