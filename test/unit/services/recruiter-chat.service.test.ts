import { describe, expect, it, vi } from "vitest";
import { renderCareerBody } from "../../../src/services/career/body";
import {
  ChatExpiredError,
  ChatRevokedError,
  ForbiddenError,
  LimitReachedError,
  NotFoundError,
  ValidationError,
} from "../../../src/services/errors";
import { sampleDocumentV2, textDocumentV2 } from "../../support/career";
import { readAll } from "../../support/public-chat";
import {
  COMPANY,
  EMAIL,
  JD,
  LIBRARY,
  PHONE,
  RECRUITER,
  RECRUITER_PROMPT,
  recruiterSetup,
} from "../../support/recruiter-chat";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const messages = [{ role: "user" as const, content: "What do you do?" }];

describe("recruiter chat service", () => {
  it("creates a chat with a 24-character base64url token and the default quota", async () => {
    const { recruiterChat, repo } = await recruiterSetup();
    const chat = await recruiterChat.create({ recruiterName: "  Jane  " });
    expect(chat.token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(chat).toMatchObject({
      recruiterName: "Jane",
      maxQuestions: 10,
      used: 0,
      status: "active",
    });
    const other = await recruiterChat.create({ recruiterName: "Jane" });
    expect(other.token).not.toBe(chat.token);
    expect(repo.rows).toHaveLength(2);
  });

  it("rejects invalid input naming the field and creates nothing", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    repo.resumes.set("00000000-0000-4000-8000-000000000099", { title: "T" });
    const cases: [Record<string, unknown>, string][] = [
      [{ recruiterName: " " }, "recruiterName"],
      [{ jobDescriptionShort: "x".repeat(2001) }, "jobDescriptionShort"],
      [{ maxQuestions: 0 }, "maxQuestions"],
      [{ maxQuestions: 101 }, "maxQuestions"],
      [{ maxQuestions: 1.5 }, "maxQuestions"],
      [{ expiresAt: new Date(Date.now() - 60_000).toISOString() }, "expiresAt"],
      [{ expiresAt: "not a date" }, "expiresAt"],
      [{ tailoredResumeId: MISSING }, "tailoredResumeId"],
      [{ tailoredResumeId: "nope" }, "tailoredResumeId"],
    ];
    for (const [patch, field] of cases) {
      const error = await newChat(patch).catch((e: unknown) => e);
      expect(error, field).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain(field);
    }
    expect(repo.rows).toHaveLength(0);
    await expect(
      recruiterChat.create({
        recruiterName: "A",
        maxQuestions: 100,
        jobDescriptionShort: "x".repeat(2000),
        tailoredResumeId: "00000000-0000-4000-8000-000000000099",
      }),
    ).resolves.toMatchObject({ maxQuestions: 100 });
  });

  it("computes status active, revoked and expired", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const active = await newChat();
    const revoked = await newChat();
    const expired = await newChat();
    await recruiterChat.revoke(revoked.id);
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    const byId = Object.fromEntries((await recruiterChat.list()).map((c) => [c.id, c.status]));
    expect(byId).toEqual({
      [active.id]: "active",
      [revoked.id]: "revoked",
      [expired.id]: "expired",
    });
    await recruiterChat.revoke(expired.id);
    expect((await recruiterChat.byToken(expired.token)).status).toBe("revoked");
  });

  it("answers not found for an unknown or malformed id on revoke, reset and delete", async () => {
    const { recruiterChat } = await recruiterSetup();
    for (const id of [MISSING, "not-a-uuid"]) {
      await expect(recruiterChat.revoke(id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(recruiterChat.reset(id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(recruiterChat.delete(id)).rejects.toBeInstanceOf(NotFoundError);
    }
  });

  it("resets used to zero and keeps a revoked chat revoked", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat();
    await recruiterChat.ask(chat, messages);
    await recruiterChat.revoke(chat.id);
    const reset = await recruiterChat.reset(chat.id);
    expect(reset).toMatchObject({ used: 0, status: "revoked" });
    await expect(recruiterChat.ask(chat, messages)).rejects.toBeInstanceOf(ChatRevokedError);
  });

  it("opens an active chat with the recruiter contact and no print field", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat();
    const opening = await recruiterChat.open(chat.token);
    expect(opening).toMatchObject({
      recruiterName: RECRUITER,
      company: COMPANY,
      remaining: 5,
      status: "active",
    });
    expect(opening.contact.map((c) => c.key)).toEqual(["EMAIL", "LINKEDIN"]);
    expect(JSON.stringify(opening)).not.toContain(PHONE);
  });

  it("answers not found, chat_revoked and chat_expired when opening", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    await expect(recruiterChat.open("unknown")).rejects.toBeInstanceOf(NotFoundError);
    const revoked = await newChat();
    await recruiterChat.revoke(revoked.id);
    await expect(recruiterChat.open(revoked.token)).rejects.toBeInstanceOf(ChatRevokedError);
    const expired = await newChat();
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    await expect(recruiterChat.open(expired.token)).rejects.toBeInstanceOf(ChatExpiredError);
  });

  it("refuses a session that belongs to another chat", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const a = await newChat();
    const b = await newChat();
    await expect(recruiterChat.authorize(a.token, b.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(recruiterChat.authorize(a.token, undefined)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(recruiterChat.authorize("unknown", a.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(recruiterChat.authorize(a.token, a.id)).resolves.toMatchObject({ id: a.id });
  });

  it("calls the llm with area recruiter, the prompt, the resume, the job description and the output limit", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const resumeId = "00000000-0000-4000-8000-000000000042";
    repo.resumes.set(resumeId, {
      title: "Tailored",
      structured: textDocumentV2("Tailored body about Postgres."),
    });
    const chat = await newChat({ tailoredResumeId: resumeId });
    const answer = await recruiterChat.ask(chat, messages);
    expect(await readAll(answer.stream)).toBe("Hello world");
    expect(answer.remaining).toBe(4);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ modelId: "vendor/recruiter", maxOutputTokens: 1200 });
    const prompt = calls[0]?.prompt ?? "";
    expect(prompt).toContain(RECRUITER_PROMPT);
    expect(prompt).toContain("Tailored body about Postgres.");
    expect(prompt).toContain(JD);
    expect(prompt).not.toContain("Backend Engineer");
    expect(calls[0]?.system).toContain(JD);
    expect(calls[0]?.system).toContain(RECRUITER_PROMPT);
    expect(calls[0]?.system).toContain("Tailored body about Postgres.");
  });

  it("sends the resume career body or the library body", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const emptyId = "00000000-0000-4000-8000-000000000043";
    repo.resumes.set(emptyId, { title: "Empty", structured: null });
    const empty = await newChat({ tailoredResumeId: emptyId });
    await recruiterChat.ask(empty, messages);
    const plain = await newChat({ tailoredResumeId: undefined });
    await recruiterChat.ask(plain, messages);
    const linkedId = "00000000-0000-4000-8000-000000000048";
    repo.resumes.set(linkedId, {
      title: "Linked",
      structured: textDocumentV2("Linked resume body."),
    });
    const linked = await newChat({ tailoredResumeId: linkedId });
    await recruiterChat.ask(linked, messages);
    expect(calls).toHaveLength(3);
    for (const call of calls.slice(0, 2)) expect(call.prompt).toContain("### Backend Engineer");
    expect(calls[2]?.prompt).toContain("Linked resume body.");
    expect(calls[2]?.prompt).not.toContain("### Backend Engineer");
  });

  it("sends the linked resume document rendered as markdown", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const resumeId = "00000000-0000-4000-8000-000000000044";
    const doc = sampleDocumentV2();
    repo.resumes.set(resumeId, { title: "Tailored", structured: doc });
    const chat = await newChat({ tailoredResumeId: resumeId });
    await readAll((await recruiterChat.ask(chat, messages)).stream);
    const system = calls[0]?.system ?? "";
    const body = system.slice(system.indexOf("<cv>\n") + 5, system.lastIndexOf("\n</cv>"));
    expect(body).toBe(renderCareerBody(doc, doc.items));
    expect(system).not.toContain("Backend Engineer");
  });

  it("falls back to the library body when the linked resume has no valid document", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const broken = sampleDocumentV2();
    (broken.items[0] as { title: string }).title = "";
    const cases = [
      ["00000000-0000-4000-8000-000000000045", null],
      ["00000000-0000-4000-8000-000000000046", broken],
      ["00000000-0000-4000-8000-000000000047", { version: 1, sections: [] }],
    ] as const;
    for (const [id, structured] of cases) {
      repo.resumes.set(id, { title: "R", structured });
      const chat = await newChat({ tailoredResumeId: id });
      await readAll((await recruiterChat.ask(chat, messages)).stream);
    }
    expect(calls).toHaveLength(3);
    const library = renderCareerBody({ headline: "Engineer", summary: "" }, LIBRARY);
    for (const call of calls) {
      expect(call.system).toContain(`<cv>\n${library}\n</cv>`);
      expect(call.system).not.toContain("Staff Engineer");
    }
  });

  it("tells the model the cv is empty when there is no resume and no library item", async () => {
    const { recruiterChat, calls, newChat } = await recruiterSetup({ items: [] });
    await readAll((await recruiterChat.ask(await newChat(), messages)).stream);
    expect(calls[0]?.system).toContain("Master CV is empty");
  });

  it("answers revoked, expired or limit reached without calling the llm", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const limited = await newChat({ maxQuestions: 1 });
    await recruiterChat.ask(limited, messages);
    await expect(recruiterChat.ask(limited, messages)).rejects.toBeInstanceOf(LimitReachedError);
    const revoked = await newChat();
    await recruiterChat.revoke(revoked.id);
    await expect(recruiterChat.ask(revoked, messages)).rejects.toBeInstanceOf(ChatRevokedError);
    const expired = await newChat();
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    await expect(recruiterChat.ask(expired, messages)).rejects.toBeInstanceOf(ChatExpiredError);
    const gone = await newChat();
    await recruiterChat.delete(gone.id);
    await expect(recruiterChat.ask(gone, messages)).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(1);
  });

  it("gives the question back when the llm is unavailable", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup({
      mock: { failBeforeFirstChunk: true },
    });
    const chat = await newChat();
    await expect(recruiterChat.ask(chat, messages)).rejects.toMatchObject({
      code: "llm_unavailable",
    });
    expect(repo.rows[0]).toMatchObject({ used: 0, lastUsedAt: null });
  });

  it("keeps the question counted when a non-llm error breaks the call", async () => {
    const { recruiterChat, repo, profile, newChat } = await recruiterSetup();
    const chat = await newChat();
    vi.spyOn(profile, "get").mockRejectedValue(new Error("db down"));
    await expect(recruiterChat.ask(chat, messages)).rejects.toThrow("db down");
    expect(repo.rows[0]).toMatchObject({ used: 1 });
  });

  it("sets last used and reports the remaining questions", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const chat = await newChat({ maxQuestions: 3 });
    const first = await recruiterChat.ask(chat, messages);
    const second = await recruiterChat.ask(chat, messages);
    expect([first.remaining, second.remaining]).toEqual([2, 1]);
    expect(repo.rows[0]?.lastUsedAt).toBeInstanceOf(Date);
    expect(repo.rows[0]?.used).toBe(2);
  });

  it("never puts personal data, the recruiter name or the company in the prompt", async () => {
    const { recruiterChat, calls, newChat } = await recruiterSetup();
    const chat = await newChat();
    await recruiterChat.ask(chat, messages);
    for (const secret of [EMAIL, PHONE, RECRUITER, COMPANY]) {
      for (const call of calls) expect(call.prompt).not.toContain(secret);
    }
  });

  it("stores the redacted question and the full answer when the stream completes", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup({
      mock: { chunks: ["Ten ", "years."] },
    });
    const chat = await newChat();
    const history = [
      { role: "user" as const, content: "Earlier question" },
      { role: "assistant" as const, content: "Earlier answer" },
      { role: "user" as const, content: "What do you do?" },
    ];
    const { stream } = await recruiterChat.ask(chat, history);
    expect(await repo.messages(chat.id)).toEqual([]);
    expect(await readAll(stream)).toBe("Ten years.");
    const stored = await repo.messages(chat.id);
    expect(stored.map((m) => [m.role, m.content])).toEqual([
      ["user", "What do you do?"],
      ["assistant", "Ten years."],
    ]);
  });

  it("never stores a personal info value from the question or the answer", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup({
      mock: { chunks: ["Write to ", EMAIL, " or call ", PHONE, "."] },
    });
    const chat = await newChat();
    const { stream } = await recruiterChat.ask(chat, [
      { role: "user", content: `My mail is ${EMAIL} and my phone is ${PHONE}` },
    ]);
    await readAll(stream);
    const stored = await repo.messages(chat.id);
    expect(stored).toHaveLength(2);
    for (const m of stored) {
      expect(m.content).toContain("[redacted]");
      for (const secret of [EMAIL, PHONE]) expect(m.content).not.toContain(secret);
    }
  });

  it("stores nothing when the llm is unavailable or the stream fails or is cancelled", async () => {
    const down = await recruiterSetup({ mock: { failBeforeFirstChunk: true } });
    const downChat = await down.newChat();
    await expect(down.recruiterChat.ask(downChat, messages)).rejects.toMatchObject({
      code: "llm_unavailable",
    });
    expect(await down.repo.messages(downChat.id)).toEqual([]);

    const broken = await recruiterSetup();
    const brokenChat = await broken.newChat();
    vi.spyOn(broken.llm, "stream").mockResolvedValue({
      model: "m",
      stream: new ReadableStream<string>({
        start(controller) {
          controller.enqueue("partial");
          controller.error(new Error("provider died"));
        },
      }),
    });
    const { stream } = await broken.recruiterChat.ask(brokenChat, messages);
    await expect(readAll(stream)).rejects.toThrow("provider died");
    expect(await broken.repo.messages(brokenChat.id)).toEqual([]);

    const cancelled = await recruiterSetup({ mock: { chunks: ["a", "b", "c"] } });
    const cancelledChat = await cancelled.newChat();
    const answer = await cancelled.recruiterChat.ask(cancelledChat, messages);
    const reader = answer.stream.getReader();
    await reader.read();
    await reader.cancel();
    expect(await cancelled.repo.messages(cancelledChat.id)).toEqual([]);
  });

  it("streams the whole answer when storing the transcript fails", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup({
      mock: { chunks: ["Hi", "!"] },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    repo.failAddMessages = true;
    const chat = await newChat();
    const { stream } = await recruiterChat.ask(chat, messages);
    expect(await readAll(stream)).toBe("Hi!");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("returns the transcript of a chat and not found for an unknown or malformed id", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const chat = await newChat();
    expect(await recruiterChat.transcript(chat.id)).toMatchObject({
      chat: { id: chat.id },
      messages: [],
    });
    await repo.addMessages(chat.id, [{ role: "user", content: "q" }]);
    expect((await recruiterChat.transcript(chat.id)).messages.map((m) => m.content)).toEqual(["q"]);
    for (const id of [MISSING, "not-a-uuid"]) {
      await expect(recruiterChat.transcript(id)).rejects.toBeInstanceOf(NotFoundError);
    }
  });
});

describe("recruiter chat service owner notes", () => {
  const library = renderCareerBody({ headline: "Engineer", summary: "" }, LIBRARY);
  const ADDITIONAL = "\n\n## Additional information\n\nPlays chess.";
  const NEXT = "\n\n## Looking forward next\n\nStaff roles.";
  const bodyOf = (system: string | undefined) =>
    (system ?? "").slice(
      (system ?? "").indexOf("<cv>\n") + 5,
      (system ?? "").lastIndexOf("\n</cv>"),
    );
  const testAsk = [{ role: "user" as const, content: "What do you do?" }];

  async function withTexts(
    texts: { additionalInformation: string; lookingForwardNext: string },
    items?: unknown[],
  ) {
    const setup = await recruiterSetup(items ? { items } : {});
    await setup.profile.update({ ...(await setup.profile.get()), ...texts });
    const resumeId = "00000000-0000-4000-8000-000000000061";
    const doc = sampleDocumentV2();
    setup.repo.resumes.set(resumeId, {
      title: "Tailored",
      structured: doc,
      jobLink: "https://jobs.example.com/postgres-42",
      recruiterName: "Morgan Hiring",
      notes: "Salary band discussed privately",
    });
    const unlinked = await setup.newChat();
    const linked = await setup.newChat({ tailoredResumeId: resumeId });
    await readAll((await setup.recruiterChat.ask(unlinked, messages)).stream);
    await readAll((await setup.recruiterChat.ask(linked, messages)).stream);
    await readAll(await setup.recruiterChat.test(testAsk));
    return { calls: setup.calls, resume: renderCareerBody(doc, doc.items) };
  }

  it("ends the body with additional information with and without a linked resume", async () => {
    const { calls, resume } = await withTexts({
      additionalInformation: " Plays chess. ",
      lookingForwardNext: "",
    });
    expect(calls).toHaveLength(3);
    expect(bodyOf(calls[0]?.system)).toBe(`${library}${ADDITIONAL}`);
    expect(bodyOf(calls[1]?.system)).toBe(`${resume}${ADDITIONAL}`);
    expect(bodyOf(calls[2]?.system)).toBe(`${library}${ADDITIONAL}`);
  });

  it("ends the body with looking forward next and leaves both out for an empty library", async () => {
    const texts = { additionalInformation: "Plays chess.", lookingForwardNext: "Staff roles. " };
    const { calls, resume } = await withTexts(texts);
    expect(bodyOf(calls[0]?.system)).toBe(`${library}${ADDITIONAL}${NEXT}`);
    expect(bodyOf(calls[1]?.system)).toBe(`${resume}${ADDITIONAL}${NEXT}`);
    expect(bodyOf(calls[2]?.system)).toBe(`${library}${ADDITIONAL}${NEXT}`);

    const onlyNext = await withTexts({
      additionalInformation: "",
      lookingForwardNext: "Staff roles.",
    });
    expect(bodyOf(onlyNext.calls[0]?.system)).toBe(`${library}${NEXT}`);

    const empty = await withTexts(texts, []);
    const emptyCv =
      "The Master CV is empty: tell the recruiter there is no career information yet.";
    expect(bodyOf(empty.calls[0]?.system)).toBe(emptyCv);
    expect(bodyOf(empty.calls[1]?.system)).toBe(empty.resume);
    expect(bodyOf(empty.calls[2]?.system)).toBe(emptyCv);
    for (const call of empty.calls) {
      expect(call.prompt).not.toContain("Plays chess.");
      expect(call.prompt).not.toContain("Staff roles.");
    }
  });

  it("sends today's bodies when both texts are empty", async () => {
    const { calls, resume } = await withTexts({
      additionalInformation: " ",
      lookingForwardNext: "",
    });
    expect(bodyOf(calls[0]?.system)).toBe(library);
    expect(bodyOf(calls[1]?.system)).toBe(resume);
    expect(bodyOf(calls[2]?.system)).toBe(library);
    for (const call of calls) expect(call.prompt).not.toContain("## Looking forward next");
  });

  it("never sends a linked resume's tracking fields", async () => {
    const { calls } = await withTexts({
      additionalInformation: "Plays chess.",
      lookingForwardNext: "Staff roles.",
    });
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      const sent = `${call.system ?? ""}\n${call.prompt ?? ""}`;
      expect(sent).not.toContain("jobs.example.com");
      expect(sent).not.toContain("Morgan Hiring");
      expect(sent).not.toContain("Salary band discussed privately");
    }
  });
});

describe("recruiter chat update", () => {
  const RESUME = "00000000-0000-4000-8000-000000000099";
  const edit = { recruiterName: "Janet", company: "Initech", jobDescriptionShort: "New JD" };

  it("rejects max questions below used", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const chat = await newChat({ maxQuestions: 5 });
    const row = repo.rows.find((r) => r.id === chat.id);
    if (row) row.used = 3;
    const error = await recruiterChat
      .update(chat.id, { ...edit, maxQuestions: 2 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe(
      "maxQuestions: must be at least the questions already used (3)",
    );
    expect(row).toMatchObject({ recruiterName: RECRUITER, maxQuestions: 5, used: 3 });
  });

  it("rejects each invalid field with the create message", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    repo.resumes.set(RESUME, { title: "T" });
    const chat = await newChat();
    const cases: [Record<string, unknown>, string][] = [
      [{ recruiterName: " " }, "recruiterName: must not be empty"],
      [{ jobDescriptionShort: "x".repeat(2001) }, "jobDescriptionShort: must be at most 2000"],
      [{ maxQuestions: 0 }, "maxQuestions: must be an integer from 1 to 100"],
      [{ maxQuestions: 101 }, "maxQuestions: must be an integer from 1 to 100"],
      [
        { expiresAt: new Date(Date.now() - 60_000).toISOString() },
        "expiresAt: must be in the future",
      ],
      [{ tailoredResumeId: MISSING }, "tailoredResumeId: Tailored Resume not found"],
    ];
    for (const [patch, message] of cases) {
      const error = await recruiterChat
        .update(chat.id, { recruiterName: "A", maxQuestions: 5, ...patch })
        .catch((e: unknown) => e);
      expect(error, message).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain(message);
    }
    expect(repo.rows[0]).toMatchObject({ recruiterName: RECRUITER, maxQuestions: 5 });
  });

  it("saves the six fields", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    repo.resumes.set(RESUME, { title: "T" });
    const chat = await newChat();
    const expiresAt = new Date(Date.now() + 3_600_000);
    const saved = await recruiterChat.update(chat.id, {
      ...edit,
      maxQuestions: 9,
      tailoredResumeId: RESUME,
      expiresAt: expiresAt.toISOString(),
    });
    expect(saved).toMatchObject({
      ...edit,
      maxQuestions: 9,
      tailoredResumeId: RESUME,
      token: chat.token,
      status: "active",
    });
    expect(saved.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  it("clears the expiry", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat({ expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(chat.expiresAt).not.toBeNull();
    const saved = await recruiterChat.update(chat.id, { ...edit, expiresAt: "" });
    expect(saved.expiresAt).toBeNull();
  });

  it("edits revoked and expired chats without changing status", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const revoked = await newChat();
    await recruiterChat.revoke(revoked.id);
    const expired = await newChat();
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    const a = await recruiterChat.update(revoked.id, edit);
    expect(a).toMatchObject({ recruiterName: "Janet", status: "revoked" });
    // A past expiry is invalid on save, so the Owner clears or moves it; the edit itself never sets status.
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const b = await recruiterChat.update(expired.id, { ...edit, expiresAt: future });
    expect(b).toMatchObject({ recruiterName: "Janet", status: "active" });
    expect(repo.rows.find((r) => r.id === revoked.id)?.status).toBe("revoked");
  });

  it("answers not found for a missing or malformed id", async () => {
    const { recruiterChat } = await recruiterSetup();
    for (const id of [MISSING, "nope"]) {
      const error = await recruiterChat.update(id, edit).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).message).toBe("Recruiter Chat not found");
    }
  });

  it("accepts max equal to used and the next ask hits the limit", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat({ maxQuestions: 5 });
    await readAll((await recruiterChat.ask(chat, messages)).stream);
    const saved = await recruiterChat.update(chat.id, { ...edit, maxQuestions: 1 });
    expect(saved).toMatchObject({ maxQuestions: 1, used: 1 });
    await expect(recruiterChat.ask(saved, messages)).rejects.toBeInstanceOf(LimitReachedError);
  });
});
