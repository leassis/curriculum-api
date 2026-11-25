import { afterEach, describe, expect, it, vi } from "vitest";
import { startTestDatabase } from "../../support/postgres-container";

const URL_WITH_SECRET = "postgres://test:s3cret@localhost:55432/test";

function fakeContainer() {
  const events: string[] = [];
  const container = {
    getConnectionUri: () => URL_WITH_SECRET,
    stop: async () => {
      events.push("stop");
    },
  };
  return { events, container };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("test database container", () => {
  it("starts postgres:18 and returns its URL", async () => {
    const { container } = fakeContainer();
    const images: string[] = [];
    const db = await startTestDatabase({
      startContainer: async (image) => {
        images.push(image);
        return container;
      },
      migrate: async () => {},
    });
    expect(images).toEqual(["postgres:18"]);
    expect(db.url).toBe(URL_WITH_SECRET);
  });

  it("migrates the container before returning", async () => {
    const { container } = fakeContainer();
    let migrated: string | undefined;
    let migrationDone = false;
    const db = await startTestDatabase({
      startContainer: async () => container,
      migrate: async (url) => {
        await Promise.resolve();
        migrated = url;
        migrationDone = true;
      },
    });
    expect(migrationDone).toBe(true);
    expect(migrated).toBe(db.url);
  });

  it("stops the container when migrations fail", async () => {
    const { container, events } = fakeContainer();
    const failed = startTestDatabase({
      startContainer: async () => container,
      migrate: async () => {
        events.push("migrate");
        throw new Error("relation already exists");
      },
    });
    await expect(failed).rejects.toThrow("relation already exists");
    expect(events).toEqual(["migrate", "stop"]);
  });

  it("fails naming Docker when no container runtime is reachable", async () => {
    let migrated = false;
    const failed = startTestDatabase({
      startContainer: async () => {
        throw new Error("Could not find a working container runtime strategy");
      },
      migrate: async () => {
        migrated = true;
      },
    });
    await expect(failed).rejects.toThrow(/Docker/);
    expect(migrated).toBe(false);
  });

  it("never logs or throws a connection string", async () => {
    const logged: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    }

    const { container } = fakeContainer();
    const thrown: string[] = [];
    const collect = (p: Promise<unknown>) =>
      p.catch((err: Error) => {
        thrown.push(err.message);
      });

    await startTestDatabase({ startContainer: async () => container, migrate: async () => {} });
    await collect(
      startTestDatabase({
        startContainer: async () => container,
        migrate: async (url) => {
          throw new Error(`connect failed for ${url}?sslmode=disable`);
        },
      }),
    );
    await collect(
      startTestDatabase({
        startContainer: async () => {
          throw new Error(`docker said ${URL_WITH_SECRET}`);
        },
        migrate: async () => {},
      }),
    );

    expect(thrown).toHaveLength(2);
    for (const text of [...logged, ...thrown]) expect(text).not.toContain("postgres://");
    for (const text of thrown) expect(text).not.toContain("s3cret");
  });
});
