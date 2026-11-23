import { beforeEach, describe, expect, it } from "vitest";
import { recruiterChats, tailoredResumes } from "../../../src/db/schema";
import { ResumeRepository } from "../../../src/repositories/resume.repository";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { ResumeService } from "../../../src/services/resume.service";
import { sampleReplyV2 } from "../../support/career";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { button, formFields, gesture, tags } from "../../support/html";
import { createRecordingModel } from "../../support/mock-llm";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const options = { models: { tailor: "cfg/tailor" } };
const EMAIL = "ada.private@example.com";
const PHONE = "+44 20 7946 0958";
const JD = "Senior backend engineer, Postgres.";

const EXPERIENCE = {
  title: "Staff Engineer",
  organisation: "Globex",
  startYear: "2020",
  current: "on",
  details: "Led the platform team.\n- Cut p99 latency by 40%",
  stack: "TypeScript, Postgres",
};

async function setup() {
  const config = resolvedConfig(options);
  const base = createTestApp({ config: options });
  const { services } = base;
  await services.profile.update({
    fullName: "Ada Lovelace",
    headline: "Engineer",
    summary: "Backend engineer with ten years of experience.",
    publicSystemPrompt: "p",
    recruiterSystemPrompt: "r",
    tailorSystemPrompt: "Tailor it.",
  });
  await services.career.add("experience", EXPERIENCE);
  await services.career.add("experience", {
    title: "Engineer",
    organisation: "Initech",
    startYear: "2016",
    endYear: "2020",
  });
  await services.career.add("education", {
    title: "BSc Computer Science",
    organisation: "State University",
  });
  const library = (await services.career.library()).items;
  const { factory, calls } = createRecordingModel({ text: JSON.stringify(sampleReplyV2(library)) });
  const llm = new LlmService(config, services.settings, services.personalInfo, factory, {
    info: () => {},
    warn: () => {},
  });
  const resumes = new ResumeService(
    new ResumeRepository(db),
    services.profile,
    services.settings,
    services.personalInfo,
    llm,
    services.career,
  );
  const { app } = createTestApp({ config: options, services: { llm, resumes } });
  await services.personalInfo.create({
    key: "EMAIL",
    label: "Email",
    value: EMAIL,
    visibility: "print",
    sortOrder: 1,
  });
  await services.personalInfo.create({
    key: "PHONE",
    label: "Phone",
    value: PHONE,
    visibility: "print",
    sortOrder: 2,
  });
  const cookie = `curr_admin=${await signSession({ scope: "admin" }, config.sessionSecret, 60)}`;
  const form = (fields: Record<string, string | string[]>) => {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      for (const item of Array.isArray(v) ? v : [v]) body.append(k, item);
    }
    return {
      body: body.toString(),
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    };
  };
  const send = (method: string, path: string, fields?: Record<string, string | string[]>) =>
    app.request(path, fields ? { method, ...form(fields) } : { method, headers: { cookie } });
  const create = async (extra: Record<string, string> = {}) => {
    const res = await send("POST", "/admin/resumes", {
      title: "Backend at Acme",
      company: "Acme",
      jobDescription: JD,
      ...extra,
    });
    expect(res.status).toBe(303);
    // Create now generates once; these tests count the model calls of their own explicit generate.
    calls.length = 0;
    return (res.headers.get("location") ?? "").split("/").pop() as string;
  };
  return { send, create, calls, services };
}

describe("resumes with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("creates, generates, edits, prints, downloads and deletes on the real database", async () => {
    const { send, create, calls } = await setup();
    const id = await create();
    expect(await (await send("GET", "/admin/resumes")).text()).toContain("Backend at Acme");

    const generated = await send("POST", `/admin/resumes/${id}/generate`);
    expect(generated.status).toBe(200);
    expect(await generated.text()).toContain("Staff Engineer");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.maxOutputTokens).toBe(6000);
    for (const secret of [EMAIL, PHONE, "Ada Lovelace"]) {
      expect(calls[0]?.prompt).not.toContain(secret);
    }
    expect(calls[0]?.prompt).toContain(JD);
    expect(calls[0]?.prompt).toContain("Staff Engineer");

    const saved = await send("PUT", `/admin/resumes/${id}`, { headerFields: ["EMAIL"] });
    expect(await saved.text()).toBe("Saved");

    const print = await send("GET", `/admin/resumes/${id}/print`);
    expect(print.headers.get("cache-control")).toBe("no-store");
    const html = await print.text();
    expect(html).toContain("<h1>Ada Lovelace</h1>");
    expect(html).toContain(`Email: ${EMAIL}`);
    expect(html).not.toContain("Phone:");
    expect(html).toContain("<h2>Experience</h2>");
    expect(html).toContain("<h3>Staff Engineer</h3>");
    expect(calls).toHaveLength(1);

    const download = await send("GET", `/admin/resumes/${id}/download.md`);
    expect(download.headers.get("content-disposition")).toBe(
      'attachment; filename="backend-at-acme.md"',
    );
    const markdown = await download.text();
    expect(markdown.startsWith(`# Ada Lovelace\nEmail: ${EMAIL}\n\n`)).toBe(true);
    expect(markdown).toContain("### Staff Engineer");

    const profilePrint = await (await send("GET", "/admin/profile/print")).text();
    expect(profilePrint).toContain(`Phone: ${PHONE}`);

    expect((await send("DELETE", `/admin/resumes/${id}`)).status).toBe(200);
    expect((await send("GET", `/admin/resumes/${id}`)).status).toBe(404);
    expect(await (await send("GET", "/admin/resumes")).text()).toContain("No tailored resumes yet");
  });

  it("generates with custom instructions on the real database", async () => {
    const { send, create, calls } = await setup();
    const id = await create({ customInstructions: "Write in Portuguese" });
    const generated = await send("POST", `/admin/resumes/${id}/generate`, {
      customInstructions: "Write in Portuguese and keep it to one page",
    });
    expect(generated.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.prompt).toContain("Write in Portuguese and keep it to one page");
    expect(calls[0]?.prompt.indexOf("Write in Portuguese")).toBeLessThan(
      calls[0]?.prompt.indexOf("<<<JOB_DESCRIPTION_START>>>") ?? -1,
    );
    for (const secret of [EMAIL, PHONE, "Ada Lovelace"]) {
      expect(calls[0]?.prompt).not.toContain(secret);
    }
    const reloaded = await (await send("GET", `/admin/resumes/${id}`)).text();
    expect(reloaded).toContain("Write in Portuguese and keep it to one page</textarea>");
    const [row] = await db.select().from(tailoredResumes);
    expect(row?.customInstructions).toBe("Write in Portuguese and keep it to one page");
  });

  it("deletes a resume linked to a recruiter chat", async () => {
    const { send, create } = await setup();
    const id = await create();
    await db
      .insert(recruiterChats)
      .values({ token: "tok", recruiterName: "R", tailoredResumeId: id });
    expect((await send("DELETE", `/admin/resumes/${id}`)).status).toBe(200);
    const rows = await db.select().from(recruiterChats);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tailoredResumeId).toBeNull();
  });
});

describe("admin resumes career routes", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("edits the resume copy and leaves the library unchanged", async () => {
    const { send, create, services } = await setup();
    const id = await create();
    expect((await send("POST", `/admin/resumes/${id}/generate`)).status).toBe(200);
    const libraryBefore = await services.career.library();

    const page = await (await send("GET", `/admin/resumes/${id}`)).text();
    const edit = gesture(button(page, "Edit Staff Engineer"));
    const form = await (await send(edit.method, edit.path)).text();
    const itemForm = tags(form, "form").find((f) => f.attrs["hx-put"]?.includes("/items/"));
    expect(itemForm).toBeDefined();
    const put = gesture(itemForm as never);
    const saved = await send(put.method, put.path, {
      ...formFields((itemForm as { html: string }).html),
      title: "Principal Engineer",
    });
    expect(saved.status).toBe(200);
    expect(await saved.text()).toContain("Principal Engineer");

    const down = gesture(button(page, "Move Engineer up"));
    expect((await send(down.method, down.path, down.fields)).status).toBe(200);
    const removal = gesture(button(page, "Delete BSc Computer Science"));
    expect((await send(removal.method, removal.path)).status).toBe(200);

    const add = gesture(button(page, /Add experience$/));
    const addForm = await (await send(add.method, add.path)).text();
    const newForm = tags(addForm, "form").find((f) => f.attrs["hx-post"]?.includes("/items"));
    expect(newForm).toBeDefined();
    const post = gesture(newForm as never);
    const added = await send(post.method, post.path, {
      ...formFields((newForm as { html: string }).html),
      title: "Side role",
      organisation: "Side Co",
      startYear: "2024",
    });
    expect(added.status).toBe(200);

    const [row] = await db.select().from(tailoredResumes);
    const doc = row?.structured as unknown as {
      items: { title: string; sourceId: string | null }[];
    };
    const items = doc.items;
    expect(items.map((i) => i.title)).toEqual(["Engineer", "Principal Engineer", "Side role"]);
    expect(items.at(-1)?.sourceId).toBeNull();
    expect(await services.career.library()).toEqual(libraryBefore);
  });

  it("saves the header on the resume only", async () => {
    const { send, create, services } = await setup();
    const id = await create();
    await send("POST", `/admin/resumes/${id}/generate`);
    const res = await send("PUT", `/admin/resumes/${id}/header`, {
      headline: "Platform engineer",
      summary: "Tailored summary.",
    });
    expect(res.status).toBe(200);
    const [row] = await db.select().from(tailoredResumes);
    expect(row?.structured).toMatchObject({
      headline: "Platform engineer",
      summary: "Tailored summary.",
    });
    expect((await services.profile.get()).headline).toBe("Engineer");
  });
});

describe("admin resumes left out routes", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  const generatedResume = async () => {
    const s = await setup();
    const id = await s.create();
    await s.send("POST", `/admin/resumes/${id}/generate`);
    const page = async () => (await s.send("GET", `/admin/resumes/${id}`)).text();
    const click = async (html: string, label: string | RegExp) => {
      const { method, path } = gesture(button(html, label));
      return s.send(method, path);
    };
    const stored = async () => {
      const [row] = await db.select().from(tailoredResumes);
      const doc = row?.structured as unknown as {
        items: { title: string; sourceId: string | null }[];
      };
      return doc.items;
    };
    return { ...s, id, page, click, stored };
  };

  it("lists a deleted item under left out", async () => {
    const { page, click, stored } = await generatedResume();
    expect(await page()).not.toContain("Left out");
    const deleted = await click(await page(), "Delete Staff Engineer");
    expect(deleted.status).toBe(200);
    expect((await stored()).map((i) => i.title)).not.toContain("Staff Engineer");
    const html = await page();
    expect(html).toContain("Left out (1)");
    expect(tags(html, "details").some((d) => d.text.includes("Staff Engineer"))).toBe(true);
  });

  it("adds back a left out item and leaves the library unchanged", async () => {
    const { page, click, stored, services } = await generatedResume();
    const libraryBefore = await services.career.library();
    const globex = libraryBefore.items.find((i) => i.title === "Staff Engineer");
    await click(await page(), "Delete Staff Engineer");
    const html = await page();
    const left = tags(html, "details").find((d) => d.text.includes("Left out"));
    const added = await click(left?.html ?? "", /^Add back/);
    expect(added.status).toBe(200);
    expect(await added.text()).not.toContain("Left out");
    const items = await stored();
    expect(items.at(-1)).toMatchObject({ title: "Staff Engineer", sourceId: globex?.id });
    expect(await services.career.library()).toEqual(libraryBefore);
  });
});
