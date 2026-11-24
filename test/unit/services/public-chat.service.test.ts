import { describe, expect, it } from "vitest";
import { renderCareerBody } from "../../../src/services/career/body";
import { LimitReachedError, NotFoundError } from "../../../src/services/errors";
import { LIBRARY, publicChatSetup, readAll } from "../../support/public-chat";

const ask = [{ role: "user" as const, content: "What do you do?" }];

describe("public chat service", () => {
  it("calls the llm with area public, the system prompt, the cv, the messages and max output tokens", async () => {
    const { publicChat, calls } = await publicChatSetup();
    const history = [
      { role: "user" as const, content: "Hi" },
      { role: "assistant" as const, content: "Hello" },
      { role: "user" as const, content: "Tell me about backends" },
    ];
    const { stream, remaining } = await publicChat.ask("h1", history);
    expect(await readAll(stream)).toBe("Hello world");
    expect(remaining).toBe(4);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.modelId).toBe("vendor/public");
    expect(calls[0]?.maxOutputTokens).toBe(500);
    const prompt = calls[0]?.prompt ?? "";
    expect(prompt).toContain("Answer about the candidate only.");
    const body = renderCareerBody({ headline: "Engineer", summary: "" }, LIBRARY);
    expect(prompt).toContain(body);
    expect(prompt.indexOf("Answer about the candidate only.")).toBeLessThan(prompt.indexOf(body));
    for (const m of history) expect(prompt).toContain(m.content);
  });

  it("refuses with limit_reached and does not call the llm once the limit is used", async () => {
    const { publicChat, calls, usage } = await publicChatSetup();
    for (let i = 0; i < 5; i++) await readAll((await publicChat.ask("h1", ask)).stream);
    expect(calls).toHaveLength(5);
    await expect(publicChat.ask("h1", ask)).rejects.toBeInstanceOf(LimitReachedError);
    expect(calls).toHaveLength(5);
    expect(usage.usedBy("h1")).toBe(5);
  });

  it("sends the career body rendered from the library", async () => {
    const { publicChat, calls } = await publicChatSetup();
    await readAll((await publicChat.ask("h1", ask)).stream);
    const system = calls[0]?.system ?? "";
    const body = system.slice(system.indexOf("<cv>\n") + 5, system.lastIndexOf("\n</cv>"));
    expect(body).toBe(renderCareerBody({ headline: "Engineer", summary: "" }, LIBRARY));
    expect(body).toContain("### Backend Engineer");
    expect(body).toContain("### Billing rewrite");
  });

  it("sends the empty cv body when the library is empty", async () => {
    const { publicChat, calls } = await publicChatSetup({ items: [] });
    await readAll((await publicChat.ask("h1", ask)).stream);
    expect(calls[0]?.prompt).toContain("Master CV is empty");
  });

  it("releases the use when the llm is unavailable", async () => {
    const { publicChat, usage } = await publicChatSetup({ mock: { failBeforeFirstChunk: true } });
    await expect(publicChat.ask("h1", ask)).rejects.toMatchObject({ code: "llm_unavailable" });
    expect(usage.usedBy("h1")).toBe(0);
  });

  it("releases the use when the pii guard blocks the call", async () => {
    const { publicChat, usage, personalInfo, profile } = await publicChatSetup();
    await personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "public",
    });
    const current = await profile.get();
    await profile.update({ ...current, headline: "Reach me at ada@example.com" });
    await expect(publicChat.ask("h1", ask)).rejects.toMatchObject({ code: "internal_error" });
    expect(usage.usedBy("h1")).toBe(0);
  });

  it("applies a settings override of the limit to the next request", async () => {
    const { publicChat, settings } = await publicChatSetup();
    await readAll((await publicChat.ask("h1", ask)).stream);
    await settings.set("limits.publicQuestionsPerIpPerDay", "2");
    expect((await publicChat.ask("h1", ask)).remaining).toBe(0);
    await expect(publicChat.ask("h1", ask)).rejects.toBeInstanceOf(LimitReachedError);
  });

  it("refuses when the limit is lowered below today's use", async () => {
    const { publicChat, settings } = await publicChatSetup();
    for (let i = 0; i < 4; i++) await readAll((await publicChat.ask("h1", ask)).stream);
    await settings.set("limits.publicQuestionsPerIpPerDay", "2");
    await expect(publicChat.ask("h1", ask)).rejects.toBeInstanceOf(LimitReachedError);
  });

  it("answers not_found without touching the counter when the profile is missing", async () => {
    const { publicChat, usage, calls } = await publicChatSetup({ seed: false });
    await expect(publicChat.ask("h1", ask)).rejects.toBeInstanceOf(NotFoundError);
    expect(usage.acquires).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("stores the ip hash and never the raw ip", async () => {
    const { publicChat, usage } = await publicChatSetup();
    await readAll((await publicChat.ask("deadbeef", ask)).stream);
    expect([...usage.rows.keys()]).toEqual(["deadbeef|2026-01-01"]);
  });
});

describe("public chat service owner notes", () => {
  const today = renderCareerBody({ headline: "Engineer", summary: "" }, LIBRARY);
  const bodyOf = (system: string) =>
    system.slice(system.indexOf("<cv>\n") + 5, system.lastIndexOf("\n</cv>"));
  async function askWith(
    texts: { additionalInformation: string; lookingForwardNext: string },
    items?: unknown[],
  ) {
    const setup = await publicChatSetup(items ? { items } : {});
    await setup.profile.update({ ...(await setup.profile.get()), ...texts });
    await readAll((await setup.publicChat.ask("h1", ask)).stream);
    return setup.calls;
  }

  it("ends the body with the additional information section", async () => {
    const calls = await askWith({
      additionalInformation: "  Plays chess.  ",
      lookingForwardNext: "",
    });
    expect(bodyOf(calls[0]?.system ?? "")).toBe(
      `${today}\n\n## Additional information\n\nPlays chess.`,
    );
  });

  it("sends today's body when both texts are empty", async () => {
    const calls = await askWith({ additionalInformation: "", lookingForwardNext: " " });
    const body = bodyOf(calls[0]?.system ?? "");
    expect(body).toBe(today);
    expect(body).not.toContain("## Looking forward next");
    expect(body).not.toContain("## Additional information");
  });

  it("puts looking forward next last and leaves both out for an empty library", async () => {
    const texts = { additionalInformation: "Plays chess.", lookingForwardNext: " Staff roles. " };
    const calls = await askWith(texts);
    expect(bodyOf(calls[0]?.system ?? "")).toBe(
      `${today}\n\n## Additional information\n\nPlays chess.\n\n## Looking forward next\n\nStaff roles.`,
    );
    const onlyNext = await askWith({
      additionalInformation: "",
      lookingForwardNext: "Staff roles.",
    });
    expect(bodyOf(onlyNext[0]?.system ?? "")).toBe(
      `${today}\n\n## Looking forward next\n\nStaff roles.`,
    );
    const empty = await askWith(texts, []);
    const prompt = empty[0]?.prompt ?? "";
    expect(prompt).toContain(
      "The Master CV is empty: tell the visitor there is no career information yet.",
    );
    expect(prompt).not.toContain("Plays chess.");
    expect(prompt).not.toContain("Staff roles.");
    expect(prompt).not.toContain("## Additional information");
    expect(prompt).not.toContain("## Looking forward next");
  });
});
