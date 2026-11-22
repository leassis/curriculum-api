import { describe, expect, it } from "vitest";
import { createGlobalSetup } from "../../support/global-setup";

const API = "https://console.neon.tech/api/v2";
const URI = "postgres://owner:s3cret@ep-test-123.neon.tech/neondb?sslmode=require";

function setupWithFakes() {
  const calls: string[] = [];
  const loaded: string[] = [];
  const fetchFake = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${String(input).slice(API.length)}`);
    const body =
      method === "POST"
        ? { branch: { id: "br-1" }, operations: [], connection_uris: [{ connection_uri: URI }] }
        : {};
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  const setup = createGlobalSetup({
    env: { NEON_API_KEY: "k", NEON_PROJECT_ID: "p", PARENT_BRANCH_ID: "br-parent" },
    fetch: fetchFake,
    migrate: async () => {},
    log: () => {},
    loadEnvFile: (path) => loaded.push(path),
  });
  return { setup, calls, loaded };
}

describe("global setup", () => {
  it("provides the branch URL", async () => {
    const { setup } = setupWithFakes();
    const provided: [string, string][] = [];
    await setup({
      provide: ((key: string, value: string) => provided.push([key, value])) as never,
    });
    expect(provided).toEqual([["testDatabaseUrl", URI]]);
  });

  it("teardown deletes the test branch", async () => {
    const { setup, calls } = setupWithFakes();
    const teardown = await setup({ provide: (() => {}) as never });
    expect(calls.some((c) => c.startsWith("DELETE"))).toBe(false);
    await (teardown as () => Promise<void>)();
    expect(calls).toContain("DELETE /projects/p/branches/br-1");
  });
});
