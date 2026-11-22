import { existsSync } from "node:fs";
import type { TestProject } from "vitest/node";
import { migrate } from "../../src/db/migrate";
import { startTestBranch, type TestBranchDeps } from "./neon-branch";

export interface GlobalSetupDeps extends TestBranchDeps {
  /** Loads an env file into `env`; never overrides a variable that is already set. */
  loadEnvFile?: (path: string) => void;
}

// `.env` first: loadEnvFile never overrides a set variable, so `.env` wins over `.env.local`.
const ENV_FILES = [".env", ".env.local"];

export function createGlobalSetup(deps: GlobalSetupDeps) {
  return async function setup({ provide }: Pick<TestProject, "provide">) {
    const load = deps.loadEnvFile ?? ((path: string) => process.loadEnvFile(path));
    for (const file of ENV_FILES) if (existsSync(file)) load(file);
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
