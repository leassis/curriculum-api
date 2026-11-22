import { beforeEach, describe, expect, it } from "vitest";
import { recruiterChats } from "../../../src/db/schema";
import { ResumeRepository } from "../../../src/repositories/resume.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new ResumeRepository(db);

const input = (title: string) => ({ title, company: null, jobDescription: `jd ${title}` });

describe("resume repository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("lists newest first", async () => {
    await repo.insert(input("first"));
    await repo.insert(input("second"));
    await repo.insert(input("third"));
    expect((await repo.list()).map((r) => r.title)).toEqual(["third", "second", "first"]);
  });

  it("inserts, finds, updates and deletes a resume", async () => {
    const created = await repo.insert({ title: "T", company: "Acme", jobDescription: "JD" });
    expect(created).toMatchObject({
      title: "T",
      company: "Acme",
      jobDescription: "JD",
      content: "",
      model: null,
      headerFields: null,
    });
    expect(await repo.find(created.id)).toMatchObject({ id: created.id });
    expect(await repo.find("00000000-0000-4000-8000-000000000000")).toBeNull();

    const updated = await repo.update(created.id, { content: "# Body", model: "m/x" });
    expect(updated).toMatchObject({ content: "# Body", model: "m/x" });
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    expect(await repo.update("00000000-0000-4000-8000-000000000000", { content: "x" })).toBeNull();

    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.delete(created.id)).toBe(false);
    expect(await repo.list()).toEqual([]);
  });

  it("reads custom instructions as empty by default", async () => {
    const created = await repo.insert(input("default"));
    expect(created.customInstructions).toBe("");
    expect((await repo.find(created.id))?.customInstructions).toBe("");
  });

  it("stores null and array header fields", async () => {
    const created = await repo.insert(input("h"));
    expect(
      (await repo.update(created.id, { headerFields: ["EMAIL", "PHONE"] }))?.headerFields,
    ).toEqual(["EMAIL", "PHONE"]);
    expect((await repo.update(created.id, { headerFields: [] }))?.headerFields).toEqual([]);
    expect((await repo.update(created.id, { headerFields: null }))?.headerFields).toBeNull();
  });

  it("deletes a resume linked to a recruiter chat and nulls the link", async () => {
    const resume = await repo.insert(input("linked"));
    const [chat] = await db
      .insert(recruiterChats)
      .values({ token: "tok", recruiterName: "R", tailoredResumeId: resume.id })
      .returning();
    expect(await repo.delete(resume.id)).toBe(true);
    const rows = await db.select().from(recruiterChats);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(chat?.id);
    expect(rows[0]?.tailoredResumeId).toBeNull();
  });
});
