import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  personalInfo,
  profile,
  recruiterChatMessages,
  recruiterChats,
  tailoredResumes,
} from "../../../src/db/schema";
import { pgErrorCode, resetDb, testDb } from "../../support/db";

const db = testDb();

const profileRow = {
  fullName: "Ada",
  headline: "Engineer",
  masterCv: "cv",
  publicSystemPrompt: "p",
  recruiterSystemPrompt: "r",
  tailorSystemPrompt: "t",
};

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return pgErrorCode(error);
  }
  return undefined;
}

describe("constraints", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("profile rejects an id other than 1", async () => {
    expect(await codeOf(db.insert(profile).values({ ...profileRow, id: 2 }))).toBe("23514");
    await db.insert(profile).values({ ...profileRow, id: 1 });
  });

  it("rejects unknown status and visibility", async () => {
    const chat = { token: "t1", recruiterName: "Rita" };
    expect(await codeOf(db.insert(recruiterChats).values({ ...chat, status: "paused" }))).toBe(
      "23514",
    );
    expect(
      await codeOf(
        db.insert(personalInfo).values({
          key: "phone",
          label: "Phone",
          valueEncrypted: "x",
          visibility: "everyone",
        }),
      ),
    ).toBe("23514");
  });

  it("rejects a duplicate recruiter token", async () => {
    await db.insert(recruiterChats).values({ token: "dup", recruiterName: "A" });
    expect(
      await codeOf(db.insert(recruiterChats).values({ token: "dup", recruiterName: "B" })),
    ).toBe("23505");
  });

  it("rejects a message with an unknown role or an unknown chat", async () => {
    const [chat] = await db
      .insert(recruiterChats)
      .values({ token: "msg", recruiterName: "A" })
      .returning();
    const chatId = chat?.id as string;
    expect(
      await codeOf(
        db.insert(recruiterChatMessages).values({ chatId, role: "system", content: "x" }),
      ),
    ).toBe("23514");
    expect(
      await codeOf(
        db.insert(recruiterChatMessages).values({
          chatId: "00000000-0000-4000-8000-00000000ffff",
          role: "user",
          content: "x",
        }),
      ),
    ).toBe("23503");
  });

  it("deleting a resume nulls the chat link", async () => {
    const [resume] = await db
      .insert(tailoredResumes)
      .values({ title: "T", jobDescription: "jd" })
      .returning();
    await db
      .insert(recruiterChats)
      .values({ token: "link", recruiterName: "A", tailoredResumeId: resume?.id });
    await db.delete(tailoredResumes).where(eq(tailoredResumes.id, resume?.id as string));
    const [chat] = await db.select().from(recruiterChats).where(eq(recruiterChats.token, "link"));
    expect(chat).toBeDefined();
    expect(chat?.tailoredResumeId).toBeNull();
  });
});
