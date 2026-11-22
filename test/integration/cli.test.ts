import { describe, expect, it } from "vitest";
import { type CliIo, runCli } from "../../src/cli";
import { TEST_DATABASE_URL } from "../support/db";

function io(env: Record<string, string | undefined>) {
  const out: string[] = [];
  const err: string[] = [];
  const cli: CliIo = {
    env,
    readStdin: async () => "",
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
  return { cli, out, err };
}

describe("cli", () => {
  it("migrate runs and requires DATABASE_URL", async () => {
    const missing = io({});
    expect(await runCli(["migrate"], missing.cli)).toBe(1);
    expect(missing.err).toEqual(["DATABASE_URL is required"]);

    const ok = io({ DATABASE_URL: TEST_DATABASE_URL });
    expect(await runCli(["migrate"], ok.cli)).toBe(0);
    expect(ok.err).toEqual([]);
  });
});
