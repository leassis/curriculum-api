import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type CliIo, hostOf, runCli } from "../../src/cli";
import { migrate } from "../../src/db/migrate";

vi.mock("../../src/db/migrate", () => ({ migrate: vi.fn(async () => {}) }));

function io(stdin = "", env: Record<string, string | undefined> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const cli: CliIo = {
    env,
    readStdin: async () => stdin,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
  return { cli, out, err };
}

describe("cli", () => {
  it("hash-password prints a bcrypt hash that verifies", async () => {
    const { cli, out } = io("correct horse battery staple\n");
    expect(await runCli(["hash-password"], cli)).toBe(0);
    expect(out).toHaveLength(1);
    const hash = out[0] as string;
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare("correct horse battery staple", hash)).toBe(true);
    expect(await bcrypt.compare("wrong", hash)).toBe(false);
  });

  it("unknown command prints usage and exits 1", async () => {
    for (const argv of [["frobnicate"], []]) {
      const { cli, out, err } = io();
      expect(await runCli(argv, cli)).toBe(1);
      expect(out).toEqual([]);
      const usage = err.join("\n");
      for (const command of ["migrate", "seed", "hash-password", "cleanup"]) {
        expect(usage).toContain(command);
      }
    }
  });

  describe("migrate", () => {
    beforeEach(() => vi.mocked(migrate).mockClear());

    it("prefers DATABASE_URL_UNPOOLED", async () => {
      const { cli } = io("", { DATABASE_URL: "pooled", DATABASE_URL_UNPOOLED: "direct" });
      expect(await runCli(["migrate"], cli)).toBe(0);
      expect(migrate).toHaveBeenCalledWith("direct");
    });

    it("falls back to DATABASE_URL", async () => {
      const { cli } = io("", { DATABASE_URL: "pooled" });
      expect(await runCli(["migrate"], cli)).toBe(0);
      expect(migrate).toHaveBeenCalledWith("pooled");
    });

    it("errors when neither is set", async () => {
      const { cli, err } = io();
      expect(await runCli(["migrate"], cli)).toBe(1);
      expect(err).toEqual(["DATABASE_URL is required"]);
      expect(migrate).not.toHaveBeenCalled();
    });
  });

  it("hostOf shows host and database but never credentials", () => {
    expect(hostOf("postgres://user:secret@ep-x-pooler.neon.tech/prod?sslmode=require")).toBe(
      "ep-x-pooler.neon.tech/prod",
    );
    expect(hostOf("not a url")).toBe("(unparseable url)");
  });

  describe("migrate", () => {
    beforeEach(() => vi.mocked(migrate).mockClear());

    it("prefers DATABASE_URL_UNPOOLED", async () => {
      const { cli } = io("", { DATABASE_URL: "pooled", DATABASE_URL_UNPOOLED: "direct" });
      expect(await runCli(["migrate"], cli)).toBe(0);
      expect(migrate).toHaveBeenCalledWith("direct");
    });

    it("falls back to DATABASE_URL", async () => {
      const { cli } = io("", { DATABASE_URL: "pooled" });
      expect(await runCli(["migrate"], cli)).toBe(0);
      expect(migrate).toHaveBeenCalledWith("pooled");
    });

    it("errors when neither is set", async () => {
      const { cli, err } = io();
      expect(await runCli(["migrate"], cli)).toBe(1);
      expect(err).toEqual(["DATABASE_URL is required"]);
      expect(migrate).not.toHaveBeenCalled();
    });
  });
});
