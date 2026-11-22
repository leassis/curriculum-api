import { describe, expect, it } from "vitest";
import { startTestBranch } from "../../support/neon-branch";

const API = "https://console.neon.tech/api/v2";
const KEY = "napi_secret_key_123";
const URI = "postgres://owner:s3cret@ep-test-123.neon.tech/neondb?sslmode=require";
const NOW = new Date("2026-11-22T10:00:00.123Z");

interface Call {
  method: string;
  path: string;
  body: unknown;
  auth: string | null;
}

interface FakeOptions {
  createStatus?: number;
  deleteStatus?: number;
  pollsBeforeFinished?: number;
}

function fakeNeon(options: FakeOptions = {}) {
  const calls: Call[] = [];
  let polls = 0;
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetchFake = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const path = url.slice(API.length);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    calls.push({
      method,
      path,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      auth: headers.get("Authorization"),
    });
    if (method === "POST" && path.endsWith("/branches")) {
      if (options.createStatus)
        return reply(options.createStatus, { message: "branch limit reached" });
      return reply(201, {
        branch: { id: "br-new" },
        operations: [{ id: "op-1", status: "running" }],
        connection_uris: [{ connection_uri: URI }],
      });
    }
    if (method === "GET" && path.includes("/operations/")) {
      polls += 1;
      const done = polls > (options.pollsBeforeFinished ?? 0);
      return reply(200, { operation: { id: "op-1", status: done ? "finished" : "running" } });
    }
    if (method === "DELETE") {
      if (options.deleteStatus)
        return reply(options.deleteStatus, { message: `denied ${URI} ${KEY}` });
      return reply(200, {});
    }
    return reply(404, { message: "unexpected call" });
  }) as typeof fetch;

  return { fetch: fetchFake, calls };
}

function setup(env: Record<string, string | undefined> = {}, options: FakeOptions = {}) {
  const neon = fakeNeon(options);
  const order: string[] = [];
  const logs: string[] = [];
  const migrated: string[] = [];
  let migrateError: Error | undefined;
  const deps = {
    env: {
      NEON_API_KEY: KEY,
      NEON_PROJECT_ID: "proj-1",
      PARENT_BRANCH_ID: "br-parent",
      ...env,
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await neon.fetch(input, init);
      order.push(`${init?.method ?? "GET"} ${String(input).slice(API.length)}`);
      return res;
    }) as typeof fetch,
    migrate: async (url: string) => {
      order.push("migrate");
      migrated.push(url);
      if (migrateError) throw migrateError;
    },
    log: (line: string) => logs.push(line),
    now: () => NOW,
    sleep: async () => {},
  };
  return {
    deps,
    calls: neon.calls,
    order,
    logs,
    migrated,
    failMigrate: (e: Error) => {
      migrateError = e;
    },
  };
}

describe("startTestBranch", () => {
  it("forks TEST_PARENT_BRANCH_ID, falling back to PARENT_BRANCH_ID", async () => {
    const preferred = setup({ TEST_PARENT_BRANCH_ID: "br-test-parent" });
    await startTestBranch(preferred.deps);
    const create = preferred.calls.find((c) => c.method === "POST");
    expect(create?.path).toBe("/projects/proj-1/branches");
    expect(create?.auth).toBe(`Bearer ${KEY}`);
    expect(create?.body).toMatchObject({
      branch: { parent_id: "br-test-parent" },
      endpoints: [{ type: "read_write" }],
    });

    const fallback = setup();
    await startTestBranch(fallback.deps);
    const body = fallback.calls.find((c) => c.method === "POST")?.body as {
      branch: { name: string; parent_id: string };
    };
    expect(body.branch.parent_id).toBe("br-parent");
    expect(body.branch.name).toMatch(/^test-/);
  });

  it("sets expires_at one hour ahead", async () => {
    const t = setup();
    await startTestBranch(t.deps);
    const body = t.calls.find((c) => c.method === "POST")?.body as {
      branch: { expires_at: string };
    };
    expect(body.branch.expires_at).toBe("2026-11-22T11:00:00Z");
  });

  it("migrates the branch after its operations finish", async () => {
    const t = setup({}, { pollsBeforeFinished: 2 });
    const branch = await startTestBranch(t.deps);
    expect(t.migrated).toEqual([URI]);
    expect(branch.url).toBe(URI);
    expect(branch.branchId).toBe("br-new");
    const polls = t.order.filter((o) => o.startsWith("GET /projects/proj-1/operations/op-1"));
    expect(polls).toHaveLength(3);
    expect(t.order.indexOf("migrate")).toBeGreaterThan(t.order.lastIndexOf(polls[2] as string));
  });

  it("names each missing variable before calling Neon", async () => {
    for (const name of ["NEON_API_KEY", "NEON_PROJECT_ID", "PARENT_BRANCH_ID"]) {
      const t = setup({ [name]: undefined });
      await expect(startTestBranch(t.deps)).rejects.toThrow(`${name} is not set`);
      expect(t.calls).toEqual([]);
    }
  });

  it("reports a failed Neon call with method, path, status and message", async () => {
    const t = setup({}, { createStatus: 422 });
    await expect(startTestBranch(t.deps)).rejects.toThrow(
      "Neon API POST /projects/proj-1/branches returned 422: branch limit reached",
    );
    expect(t.migrated).toEqual([]);
  });

  it("never prints the API key or a connection string", async () => {
    const t = setup({}, { deleteStatus: 403 });
    const branch = await startTestBranch(t.deps);
    await branch.stop();

    const failing = setup({}, { createStatus: 500 });
    const err = await startTestBranch(failing.deps).catch((e: Error) => e);

    const migrateFails = setup();
    migrateFails.failMigrate(new Error("boom"));
    await startTestBranch(migrateFails.deps).catch(() => {});

    const text = [...t.logs, ...failing.logs, ...migrateFails.logs, (err as Error).message].join(
      "\n",
    );
    expect(text).not.toContain(KEY);
    expect(text).not.toContain("s3cret");
    expect(text).not.toContain("ep-test-123");
  });

  it("deletes the branch on stop", async () => {
    const t = setup();
    const branch = await startTestBranch(t.deps);
    expect(t.calls.some((c) => c.method === "DELETE")).toBe(false);
    await branch.stop();
    expect(t.calls.at(-1)).toMatchObject({
      method: "DELETE",
      path: "/projects/proj-1/branches/br-new",
    });
  });

  it("logs a failed delete with the branch id", async () => {
    const t = setup({}, { deleteStatus: 500 });
    const branch = await startTestBranch(t.deps);
    await expect(branch.stop()).resolves.toBeUndefined();
    expect(t.logs.join("\n")).toContain("could not delete test branch br-new");
  });

  it("deletes the branch when migration fails", async () => {
    const t = setup();
    t.failMigrate(new Error("migration exploded"));
    await expect(startTestBranch(t.deps)).rejects.toThrow("migration exploded");
    expect(t.calls.at(-1)).toMatchObject({
      method: "DELETE",
      path: "/projects/proj-1/branches/br-new",
    });
  });
});
