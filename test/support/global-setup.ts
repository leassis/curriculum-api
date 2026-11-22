import { existsSync } from "node:fs";
import type { TestProject } from "vitest/node";
import { migrate } from "../../src/db/migrate";
import { startTestBranch, type TestBranchDeps } from "./neon-branch";

export interface GlobalSetupDeps extends TestBranchDeps {
  /** Loads an env file into `env`; never overrides a variable that is already set. */
  loadEnvFile?: (path: string) => void;
  /** Whether an env file exists; defaults to the filesystem. */
  fileExists?: (path: string) => boolean;
}

// `.env` first: loadEnvFile never overrides a set variable, so `.env` wins over `.env.local`.
const ENV_FILES = [".env", ".env.local"];

export function createGlobalSetup(deps: GlobalSetupDeps) {
  return async function setup({ provide }: Pick<TestProject, "provide">) {
    const load = deps.loadEnvFile ?? ((path: string) => process.loadEnvFile(path));
    const exists = deps.fileExists ?? existsSync;
    for (const file of ENV_FILES) if (exists(file)) load(file);
    const branch = await startTestBranch(deps);
    provide("testDatabaseUrl", branch.url);
    return branch.stop;
  };
}

export default createGlobalSetup({
  env: process.env,
  fetch,
  migrate,
  log: (line) => console.log(line),
});
