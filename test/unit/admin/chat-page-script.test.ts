import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { CHAT_PAGE_JS } from "../../../src/admin/chat-page/script";

interface Node {
  textContent: string;
  className: string;
  children: Node[];
  dataset: Record<string, string>;
  disabled: boolean;
  value: string;
  handlers: Record<string, (e: { preventDefault(): void }) => void>;
  appendChild(n: Node): Node;
  removeChild(n: Node): void;
  addEventListener(type: string, fn: (e: { preventDefault(): void }) => void): void;
  focus(): void;
}

const node = (): Node => ({
  textContent: "",
  className: "",
  children: [],
  dataset: {},
  disabled: false,
  value: "",
  handlers: {},
  appendChild(n) {
    this.children.push(n);
    return n;
  },
  removeChild(n) {
    this.children = this.children.filter((c) => c !== n);
  },
  addEventListener(type, fn) {
    this.handlers[type] = fn;
  },
  focus() {},
});

type Call = { url: string; method: string; body?: string };
type Handler = (call: Call) => Response | Promise<Response>;

const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

const stream = (chunks: string[], init: ResponseInit = {}) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
        controller.close();
      },
    }),
    { status: 200, ...init },
  );

const opening = () => Response.json({ recruiterName: "Jane Roe", company: "Acme", remaining: 5 });

/** Runs the script against a fake DOM; `handler` answers each fetch. */
async function loadPage(handler: Handler) {
  const els: Record<string, Node> = {};
  for (const id of ["chat-page", "who", "remaining", "status", "log", "ask", "question", "send"]) {
    els[id] = node();
  }
  (els["chat-page"] as Node).dataset = { base: "/base", token: "tok/en" };
  const calls: Call[] = [];
  const sandbox = {
    document: {
      getElementById: (id: string) => els[id],
      createElement: () => node(),
    },
    fetch: async (url: string, init: { method?: string; body?: string } = {}) => {
      const call = { url, method: init.method ?? "GET", body: init.body };
      calls.push(call);
      return handler(call);
    },
    TextDecoder,
  };
  vm.runInNewContext(CHAT_PAGE_JS, sandbox);
  await sleep();
  const get = (id: string) => els[id] as Node;
  const submit = async (text: string) => {
    get("question").value = text;
    (get("ask").handlers.submit as (e: { preventDefault(): void }) => void)({
      preventDefault() {},
    });
    for (let i = 0; i < 50 && get("send").disabled; i++) await sleep();
    await sleep();
  };
  const sent = () =>
    calls
      .filter((c) => c.url.endsWith("/chat"))
      .map((c) => (JSON.parse(c.body ?? "{}") as { messages: unknown[] }).messages);
  return { get, calls, submit, sent, log: () => get("log").children.map((c) => c.textContent) };
}

const okSession = () => new Response(null, { status: 204 });

describe("recruiter page script", () => {
  it("loads the opening and requests the session", async () => {
    const page = await loadPage((call) =>
      call.url.endsWith("/session") ? okSession() : opening(),
    );
    expect(page.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET /base/api/r/tok%2Fen",
      "POST /base/admin/chat/tok%2Fen/session",
    ]);
    expect(page.get("who").textContent).toBe("Jane Roe (Acme)");
    expect(page.get("remaining").textContent).toBe("5");
    expect(page.get("status").textContent).toBe("");
  });

  it("streams the answer into the page and sends the history", async () => {
    const page = await loadPage((call) => {
      if (call.url.endsWith("/session")) return okSession();
      if (call.url.endsWith("/chat")) {
        return stream(["Hel", "lo ", "there"], { headers: { "X-Remaining": "4" } });
      }
      return opening();
    });
    await page.submit("First?");
    expect(page.log()).toEqual(["First?", "Hello there"]);
    expect(page.get("remaining").textContent).toBe("4");
    expect(page.get("question").value).toBe("");
    expect(page.get("send").disabled).toBe(false);
    await page.submit("Second?");
    expect(page.sent()[1]).toEqual([
      { role: "user", content: "First?" },
      { role: "assistant", content: "Hello there" },
      { role: "user", content: "Second?" },
    ]);
  });

  it("shows a specific message for 410, 429 and 502 and keeps the history", async () => {
    let next: Response = stream(["Fine"], { headers: { "X-Remaining": "3" } });
    const page = await loadPage((call) => {
      if (call.url.endsWith("/session")) return okSession();
      if (call.url.endsWith("/chat")) return next;
      return opening();
    });
    await page.submit("One");
    const cases: [number, string, string][] = [
      [429, "limit_reached", "quota"],
      [502, "llm_unavailable", "not counted"],
      [410, "chat_revoked", "revoked"],
    ];
    for (const [status, error, text] of cases) {
      next = Response.json({ error }, { status });
      await page.submit("Again");
      expect(page.get("status").textContent).toContain(text);
      expect(page.log()).toEqual(["One", "Fine"]);
      expect(page.get("question").value).toBe("Again");
    }
    expect(page.get("send").disabled).toBe(true);
    next = Response.json({ error: "chat_expired" }, { status: 410 });
    const expired = await loadPage((call) =>
      call.url.endsWith("/session") ? okSession() : call.url.endsWith("/chat") ? next : opening(),
    );
    await expired.submit("Q");
    expect(expired.get("status").textContent).toContain("expired");
  });

  it("renders model text and names as literal text", async () => {
    const evil = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const page = await loadPage((call) => {
      if (call.url.endsWith("/session")) return okSession();
      if (call.url.endsWith("/chat")) return stream([evil], { headers: { "X-Remaining": "1" } });
      return Response.json({ recruiterName: "<b>Jane</b>", company: null, remaining: 2 });
    });
    expect(page.get("who").textContent).toBe("<b>Jane</b>");
    await page.submit("hi");
    expect(page.log()[1]).toBe(evil);
  });

  it("requests a new session once after a 401 and retries", async () => {
    let chats = 0;
    const page = await loadPage((call) => {
      if (call.url.endsWith("/session")) return okSession();
      if (call.url.endsWith("/chat")) {
        chats++;
        return chats === 1
          ? Response.json({ error: "unauthorized" }, { status: 401 })
          : stream(["ok"], { headers: { "X-Remaining": "2" } });
      }
      return opening();
    });
    await page.submit("Q");
    expect(page.calls.filter((c) => c.url.endsWith("/session")).length).toBe(2);
    expect(chats).toBe(2);
    expect(page.log()).toEqual(["Q", "ok"]);
  });

  it("disables the form while an answer streams", async () => {
    let finish: () => void = () => {};
    const slow = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("par"));
          finish = () => controller.close();
        },
      }),
      { status: 200, headers: { "X-Remaining": "1" } },
    );
    const page = await loadPage((call) =>
      call.url.endsWith("/session") ? okSession() : call.url.endsWith("/chat") ? slow : opening(),
    );
    page.get("question").value = "Q";
    (page.get("ask").handlers.submit as (e: { preventDefault(): void }) => void)({
      preventDefault() {},
    });
    await sleep();
    expect(page.get("send").disabled).toBe(true);
    expect(page.get("question").disabled).toBe(true);
    finish();
    for (let i = 0; i < 50 && page.get("send").disabled; i++) await sleep();
    expect(page.get("send").disabled).toBe(false);
    expect(page.log()).toEqual(["Q", "par"]);
  });

  it("does not loop on a second 401 and shows a specific message", async () => {
    const page = await loadPage((call) =>
      call.url.endsWith("/session")
        ? okSession()
        : call.url.endsWith("/chat")
          ? Response.json({ error: "unauthorized" }, { status: 401 })
          : opening(),
    );
    await page.submit("Q");
    expect(page.calls.filter((c) => c.url.endsWith("/session")).length).toBe(2);
    expect(page.sent().length).toBe(2);
    expect(page.get("status").textContent).toContain("not accepted");
    expect(page.log()).toEqual([]);
  });

  it("uses no html-injecting api", () => {
    for (const banned of [
      "innerHTML",
      "outerHTML",
      "insertAdjacentHTML",
      "document.write",
      "eval(",
    ]) {
      expect(CHAT_PAGE_JS).not.toContain(banned);
    }
    expect(CHAT_PAGE_JS).toContain("textContent");
  });
});
