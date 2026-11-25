import { afterEach, describe, expect, it, vi } from "vitest";
import globalSetupDefault, { createGlobalSetup } from "../../support/global-setup";

const URI = "postgres://test:test@localhost:55432/test";
const NEON_VARS = ["NEON_API_KEY", "NEON_PROJECT_ID", "PARENT_BRANCH_ID", "TEST_PARENT_BRANCH_ID"];

function setupWithFakes() {
  const events: string[] = [];
  const loaded: string[] = [];
  const setup = createGlobalSetup({
    startContainer: async () => {
      events.push("start");
      return {
        getConnectionUri: () => URI,
        stop: async () => {
          events.push("stop");
        },
      };
    },
    migrate: async () => {
      events.push("migrate");
    },
    loadEnvFile: (path) => {
      loaded.push(path);
      events.push(`load ${path}`);
    },
    fileExists: () => true,
  });
  return { setup, events, loaded };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("global setup", () => {
  it("provides the container URL", async () => {
    const { setup } = setupWithFakes();
    const provided: [string, string][] = [];
    await setup({
      provide: ((key: string, value: string) => provided.push([key, value])) as never,
    });
    expect(provided).toEqual([["testDatabaseUrl", URI]]);
    expect(typeof globalSetupDefault).toBe("function");
  });

  it("teardown stops the container it started", async () => {
    const { setup, events } = setupWithFakes();
    const teardown = await setup({ provide: (() => {}) as never });
    expect(events).not.toContain("stop");
    expect(typeof teardown).toBe("function");
    await (teardown as () => Promise<void>)();
    expect(events.filter((e) => e === "stop")).toEqual(["stop"]);
  });

  it("needs no Neon variable", async () => {
    for (const name of NEON_VARS) vi.stubEnv(name, "");
    for (const name of NEON_VARS) delete process.env[name];
    const { setup } = setupWithFakes();
    const provided: [string, string][] = [];
    await setup({
      provide: ((key: string, value: string) => provided.push([key, value])) as never,
    });
    expect(provided).toEqual([["testDatabaseUrl", URI]]);
  });

  it("starts one container per run", async () => {
    const { setup, events } = setupWithFakes();
    const teardown = await setup({ provide: (() => {}) as never });
    expect(events.filter((e) => e === "start")).toHaveLength(1);
    await (teardown as () => Promise<void>)();
    expect(events.filter((e) => e === "start")).toHaveLength(1);
    expect(events.indexOf("start")).toBeLessThan(events.indexOf("stop"));
  });
});
