import { beforeEach, describe, expect, it } from "vitest";
import { recruiterChats, tailoredResumes } from "../../../src/db/schema";
import { ResumeRepository } from "../../../src/repositories/resume.repository";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { ResumeService } from "../../../src/services/resume.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createRecordingModel } from "../../support/mock-llm";
import {
  editorForm,
  formFields,
  itemAt,
  opVals,
  sampleCv,
  sampleDocument,
  sampleReply,
  sectionAt,
  textForm,
} from "../../support/resume-document";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const options = { models: { tailor: "cfg/tailor" } };
const EMAIL = "ada.private@example.com";
const PHONE = "+44 20 7946 0958";
const JD = "Senior backend engineer, Postgres.";

async function setup() {
  const config = resolvedConfig(options);
  const base = createTestApp({ config: options });
  const { services } = base;
  const { factory, calls } = createRecordingModel({ text: JSON.stringify(sampleReply()) });
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
  );
  const { app } = createTestApp({ config: options, services: { llm, resumes } });
  await services.profile.update({
    fullName: "Ada Lovelace",
    headline: "Engineer",
    masterCv: sampleCv,
    publicSystemPrompt: "p",
    recruiterSystemPrompt: "r",
    tailorSystemPrompt: "Tailor it.",
  });
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
  return { send, create, calls };
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
    expect(await generated.text()).toContain('value="Staff Engineer — Globex (2020-2024)"');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.maxOutputTokens).toBe(6000);
    for (const secret of [EMAIL, PHONE, "Ada Lovelace"]) {
      expect(calls[0]?.prompt).not.toContain(secret);
    }
    expect(calls[0]?.prompt).toContain(JD);
    expect(calls[0]?.prompt).toContain("## Experience [s1]");

    const saved = await send("PUT", `/admin/resumes/${id}`, {
      ...textForm("<script>alert(1)</script>**safe**"),
      headerFields: ["EMAIL"],
    });
    expect(await saved.text()).toBe("Saved");

    const print = await send("GET", `/admin/resumes/${id}/print`);
    expect(print.headers.get("cache-control")).toBe("no-store");
    const html = await print.text();
    expect(html).toContain("<h1>Ada Lovelace</h1>");
    expect(html).toContain(`Email: ${EMAIL}`);
    expect(html).not.toContain("Phone:");
    expect(html).toContain("<strong>safe</strong>");
    expect(html).not.toContain("<script>alert");
    expect(calls).toHaveLength(1);

    const download = await send("GET", `/admin/resumes/${id}/download.md`);
    expect(download.headers.get("content-disposition")).toBe(
      'attachment; filename="backend-at-acme.md"',
    );
    expect(await download.text()).toBe(
      `# Ada Lovelace\nEmail: ${EMAIL}\n\n## Summary\n\n<script>alert(1)</script>**safe**\n`,
    );

    const profilePrint = await (await send("GET", "/admin/profile/print")).text();
    expect(profilePrint).toContain(`Phone: ${PHONE}`);
    expect(profilePrint).toContain("Backend engineer with ten years of experience.");

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

describe("resumes structured editing", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("removes an item and saves without it", async () => {
    const { send, create } = await setup();
    const id = await create();
    expect((await send("POST", `/admin/resumes/${id}/generate`)).status).toBe(200);
    const page = await (await send("GET", `/admin/resumes/${id}`)).text();
    const outside = Object.fromEntries(
      Object.entries(editorForm(page)).filter(([k]) => !k.startsWith("sections.")),
    );
    const headings = (html: string) =>
      [...html.matchAll(/name="sections\.\d+\.items\.\d+\.heading"[^>]*value="([^"]*)"/g)].map(
        (m) => m[1],
      );

    // Move the first role down, then remove it from its new place.
    const moved = await send("POST", `/admin/resumes/${id}/form`, {
      ...editorForm(page),
      ...opVals(page, "Move down", "s1.i0"),
    });
    expect(moved.status).toBe(200);
    const movedHtml = await moved.text();
    expect(headings(movedHtml).slice(0, 2)).toEqual([
      "Engineer — Initech (2016-2020)",
      "Staff Engineer — Globex (2020-2024)",
    ]);
    const removed = await send("POST", `/admin/resumes/${id}/form`, {
      ...outside,
      ...formFields(movedHtml),
      ...opVals(movedHtml, "Remove", "s1.i1"),
    });
    expect(removed.status).toBe(200);
    const removedHtml = await removed.text();
    expect(headings(removedHtml)).toEqual([
      "Engineer — Initech (2016-2020)",
      "BSc Computer Science — State University",
    ]);
    // Nothing is stored before Save.
    const [before] = await db.select().from(tailoredResumes);
    expect(before?.structured).toEqual(sampleDocument());

    const saved = await send("PUT", `/admin/resumes/${id}`, {
      ...outside,
      ...formFields(removedHtml),
    });
    expect(await saved.text()).toBe("Saved");

    const expected = sampleDocument();
    sectionAt(expected, 1).items = [itemAt(sampleDocument(), 1, 1)];
    const [row] = await db.select().from(tailoredResumes);
    expect(row?.structured).toEqual(expected);
    const reloaded = await (await send("GET", `/admin/resumes/${id}`)).text();
    expect(headings(reloaded)).toEqual([
      "Engineer — Initech (2016-2020)",
      "BSc Computer Science — State University",
    ]);
    expect(reloaded).not.toContain("Staff Engineer — Globex");
  });
});
