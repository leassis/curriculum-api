import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { FULL_NAME, publicChatSetup } from "../../support/public-chat";
import { createTestApp } from "../../support/test-app";

const EMAIL = "ada.private@example.com";
const PHONE = "+55 11 91234-5678";

async function setup() {
  const s = await publicChatSetup();
  await s.personalInfo.create({ key: "EMAIL", label: "Email", value: EMAIL, visibility: "public" });
  await s.personalInfo.create({ key: "PHONE", label: "Phone", value: PHONE, visibility: "print" });
  const { app } = createTestApp({
    services: {
      config: s.config,
      profile: s.profile,
      settings: s.settings,
      personalInfo: s.personalInfo,
      llm: s.llm,
      publicChat: s.publicChat,
    },
  });
  const cookie = `curr_session=${await signSession({ scope: "public" }, s.config.sessionSecret, 60)}`;
  const ask = async (messages: { role: string; content: string }[], ip = "198.51.100.1") => {
    const res = await app.request("/api/public/chat", {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ messages }),
    });
    await res.text();
    return res;
  };
  return { ...s, ask };
}

describe("public chat pii", () => {
  it("sends no personal info value to the model", async () => {
    const { ask, calls } = await setup();
    await ask([{ role: "user", content: "What do you do?" }]);
    await ask([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "How can I contact you?" },
    ]);
    await ask(
      [{ role: "user", content: `My email is ${EMAIL} and phone ${PHONE}` }],
      "198.51.100.2",
    );
    expect(calls.length).toBe(3);
    for (const call of calls) {
      expect(call.prompt).not.toContain(EMAIL);
      expect(call.prompt).not.toContain(PHONE);
    }
  });

  it("redacts a personal value typed by the visitor", async () => {
    const { ask, calls } = await setup();
    await ask([{ role: "user", content: `Is ${EMAIL} yours?` }]);
    expect(calls[0]?.prompt).toContain("Is [redacted] yours?");
    expect(calls[0]?.prompt).not.toContain(EMAIL);
  });

  it("keeps the full name out of the system prompt", async () => {
    const { ask, calls } = await setup();
    await ask([{ role: "user", content: "Who are you?" }]);
    expect(FULL_NAME).toBe("Ada Lovelace");
    expect(calls[0]?.prompt).not.toContain(FULL_NAME);
  });
});
