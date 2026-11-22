import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { publicUsage, recruiterChats, tailoredResumes } from "../../../src/db/schema";
import { signSession } from "../../../src/security/session";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createTestApp } from "../../support/test-app";

const db = testDb();

async function dashboard() {
  const { app } = createTestApp();
  const token = await signSession({ scope: "admin" }, resolvedConfig().sessionSecret, 60);
  const res = await app.request("/admin", { headers: { cookie: `curr_admin=${token}` } });
  expect(res.status).toBe(200);
  const html = await res.text();
  const read = (id: string) => new RegExp(`id="${id}">(\\d+)<`).exec(html)?.[1];
  return { chats: read("active-chats"), resumes: read("resumes"), usage: read("public-questions") };
}

describe("admin dashboard", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("shows zero for each count when empty", async () => {
    expect(await dashboard()).toEqual({ chats: "0", resumes: "0", usage: "0" });
  });

  it("shows active chats, resumes and usage today", async () => {
    const chat = (token: string, extra: Partial<typeof recruiterChats.$inferInsert> = {}) => ({
      token,
      recruiterName: "R",
      ...extra,
    });
    await db
      .insert(recruiterChats)
      .values([
        chat("a"),
        chat("b", { expiresAt: new Date(Date.now() + 3_600_000) }),
        chat("c", { status: "revoked" }),
        chat("d", { expiresAt: new Date(Date.now() - 3_600_000) }),
      ]);
    await db
      .insert(tailoredResumes)
      .values([1, 2, 3].map((n) => ({ title: `T${n}`, jobDescription: "jd" })));
    await db.insert(publicUsage).values([
      { ipHash: "h1", day: sql`current_date`, used: 3 },
      { ipHash: "h2", day: sql`current_date`, used: 1 },
      { ipHash: "h3", day: sql`current_date - 1`, used: 50 },
    ]);
    expect(await dashboard()).toEqual({ chats: "2", resumes: "3", usage: "4" });
  });
});
