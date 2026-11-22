import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { type CliIo, runCli } from "../../src/cli";

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
});
