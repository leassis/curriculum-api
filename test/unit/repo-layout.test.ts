import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const FILES = [
  "src/index.ts",
  "src/cli.ts",
  "src/config.ts",
  "src/app.ts",
  "src/container.ts",
  "src/env.ts",
  "src/db/schema.ts",
  "src/db/client.ts",
  "src/db/migrate.ts",
  "src/db/seed.ts",
  "src/db/cleanup.ts",
  "src/repositories/profile.repository.ts",
  "src/repositories/settings.repository.ts",
  "src/repositories/personal-info.repository.ts",
  "src/repositories/public-usage.repository.ts",
  "src/repositories/recruiter-chat.repository.ts",
  "src/repositories/resume.repository.ts",
  "src/repositories/admin-login-attempt.repository.ts",
  "src/services/errors.ts",
  "src/services/settings-keys.ts",
  "src/services/profile.service.ts",
  "src/services/settings.service.ts",
  "src/services/personal-info.service.ts",
  "src/services/llm.service.ts",
  "src/services/public-chat.service.ts",
  "src/services/recruiter-chat.service.ts",
  "src/services/resume.service.ts",
  "src/llm/openrouter.ts",
  "src/llm/first-chunk.ts",
  "src/llm/pii-guard.ts",
  "src/llm/default-prompts.ts",
  "src/security/session.ts",
  "src/security/crypto.ts",
  "src/security/turnstile.ts",
  "src/security/ip.ts",
  "src/security/admin-auth.ts",
  "src/middleware/security-headers.ts",
  "src/middleware/require-session.ts",
  "src/middleware/require-admin.ts",
  "src/middleware/require-active-recruiter-chat.ts",
  "src/routes/health.ts",
  "src/routes/openapi.ts",
  "src/routes/public.ts",
  "src/routes/recruiter.ts",
  "src/admin/index.tsx",
  "src/admin/layout.tsx",
  "src/admin/error-fragment.tsx",
  "src/admin/static/htmx.generated.ts",
  "src/admin/login/routes.ts",
  "src/admin/login/view.tsx",
  "src/admin/dashboard/routes.ts",
  "src/admin/dashboard/view.tsx",
  "src/admin/profile/routes.ts",
  "src/admin/profile/view.tsx",
  "src/admin/settings/routes.ts",
  "src/admin/settings/view.tsx",
  "src/admin/personal-info/routes.ts",
  "src/admin/personal-info/view.tsx",
  "src/admin/chats/routes.ts",
  "src/admin/chats/view.tsx",
  "src/admin/chats/messages/routes.ts",
  "src/admin/chats/messages/view.tsx",
  "src/admin/resumes/routes.ts",
  "src/admin/resumes/view.tsx",
  "src/admin/print/routes.ts",
  "src/admin/print/view.tsx",
  "drizzle/0000_init.sql",
  "drizzle/0001_demonic_winter_soldier.sql",
  "drizzle/0002_crazy_lake.sql",
  "drizzle/meta/_journal.json",
  "examples/node/server.ts",
  "scripts/check-architecture.ts",
  "scripts/vendor-htmx.ts",
  "test/support/db.ts",
  "test/support/global-setup.ts",
  "test/support/mock-llm.ts",
  "test/support/test-app.ts",
  "test/support/config.ts",
  "docker-compose.yml",
  "drizzle.config.ts",
  "biome.json",
  "tsconfig.json",
  "tsup.config.ts",
  "vitest.config.ts",
  ".github/workflows/ci.yml",
  ".env.example",
  "package.json",
];

/** True when code reads a database URL variable from an env object (dot, bracket or destructuring). */
function readsDatabaseUrl(code: string): boolean {
  const access = /\benv\s*(\?\.|\.|\[\s*["'`])\s*(TEST_)?DATABASE_URL\b/;
  const destructure = /\{[^}]*\b(TEST_)?DATABASE_URL\b[^}]*\}\s*=\s*[\w.]*\benv\b/;
  return access.test(code) || destructure.test(code);
}

describe("repo layout", () => {
  it("contains every foundation file", () => {
    const missing = FILES.filter((f) => !existsSync(join(root, f)));
    expect(missing).toEqual([]);
    expect(readdirSync(join(root, "test/support/fakes")).sort()).toEqual([
      "personal-info.fake.ts",
      "profile.fake.ts",
      "settings.fake.ts",
    ]);
  });

  it("declares esm, node 22, pnpm and strict typescript", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.type).toBe("module");
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.packageManager).toMatch(/^pnpm@/);
    expect(pkg.bin).toEqual({ "curriculum-api": "./dist/cli.js" });
    expect(pkg.exports["."].import).toBe("./dist/index.js");
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    for (const script of [
      "build",
      "typecheck",
      "lint",
      "test",
      "test:unit",
      "test:int",
      "dev",
      "db:generate",
      "vendor:htmx",
    ]) {
      expect(pkg.scripts[script], script).toBeTruthy();
    }
    const tsconfig = JSON.parse(read("tsconfig.json"));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.jsxImportSource).toBe("hono/jsx");
  });

  it("ci workflow runs lint, typecheck, test with db services and build", () => {
    const ci = parse(read(".github/workflows/ci.yml"));
    expect(Object.keys(ci.on)).toEqual(expect.arrayContaining(["pull_request"]));
    const runs: string[] = Object.values<{ steps: { run?: string }[] }>(ci.jobs)
      .flatMap((job) => job.steps)
      .map((step) => step.run ?? "");
    const position = (needle: string) => runs.findIndex((r) => r.includes(needle));
    for (const command of ["pnpm lint", "pnpm typecheck", "pnpm test", "pnpm build"]) {
      expect(position(command), command).toBeGreaterThanOrEqual(0);
    }
    const compose = position("docker compose up");
    expect(compose).toBeGreaterThanOrEqual(0);
    expect(compose).toBeLessThan(position("pnpm test"));
    expect(position("dist/cli.js migrate")).toBeGreaterThan(position("pnpm build"));
  });

  it("compose runs Neon Local only", () => {
    const composeFile = parse(read("docker-compose.yml"));
    expect(Object.keys(composeFile.services)).toEqual(["db"]);
    const db = composeFile.services.db;
    expect(db.image).toBe("neondatabase/neon_local:latest");
    expect(db.ports).toEqual(["5432:5432"]);
    expect(Object.keys(db.environment).sort()).toEqual([
      "DELETE_BRANCH",
      "NEON_API_KEY",
      "NEON_PROJECT_ID",
      "PARENT_BRANCH_ID",
    ]);
    expect(db.environment.DELETE_BRANCH).toMatch(/^\$\{DELETE_BRANCH:-true\}$/);
    for (const name of ["NEON_API_KEY", "NEON_PROJECT_ID", "PARENT_BRANCH_ID"]) {
      expect(db.environment[name], name).toMatch(new RegExp(`^\\$\\{${name}(:-)?\\}$`));
    }
  });

  it("has no local Postgres stack", () => {
    const compose = read("docker-compose.yml");
    expect(compose).not.toContain("postgres:17");
    expect(compose).not.toContain("local-neon-http-proxy");
    expect(existsSync(join(root, "docker/initdb.sql"))).toBe(false);
    const sources = (readdirSync(join(root, "src"), { recursive: true }) as string[]).filter((f) =>
      /\.tsx?$/.test(f),
    );
    const offenders = sources.filter((f) => read(`src/${f}`).includes("db.localtest.me"));
    expect(offenders).toEqual([]);
  });

  it("env example documents every variable", () => {
    const lines = read(".env.example").split("\n");
    const variables = [
      "DATABASE_URL",
      "DATABASE_URL_UNPOOLED",
      "OPENROUTER_API_KEY",
      "SESSION_SECRET",
      "TURNSTILE_SECRET",
      "ADMIN_PASSWORD_HASH",
      "IP_HASH_SALT",
      "PII_ENCRYPTION_KEY",
      "MODEL_PUBLIC",
      "MODEL_TAILOR",
      "MODEL_RECRUITER",
      "NEON_API_KEY",
      "NEON_PROJECT_ID",
      "PARENT_BRANCH_ID",
      "TEST_PARENT_BRANCH_ID",
    ];
    for (const name of variables) {
      const index = lines.findIndex((l) => l.startsWith(`${name}=`));
      expect(index, name).toBeGreaterThan(0);
      expect(lines[index - 1]?.startsWith("# "), `${name} has a comment`).toBe(true);
    }
    expect(
      lines.some((l) => l.includes("TEST_DATABASE_URL")),
      "TEST_DATABASE_URL is gone",
    ).toBe(false);
  });

  it("ships the init migration and the transcripts migration", () => {
    const sql = readdirSync(join(root, "drizzle")).filter((f) => f.endsWith(".sql"));
    expect(sql).toEqual([
      "0000_init.sql",
      "0001_demonic_winter_soldier.sql",
      "0002_crazy_lake.sql",
      "0003_zippy_frank_castle.sql",
      "0004_woozy_bloodaxe.sql",
    ]);
    const journal = JSON.parse(read("drizzle/meta/_journal.json"));
    expect(journal.entries).toHaveLength(5);
    expect(JSON.parse(read("package.json")).files).toContain("drizzle");
  });

  it("catches every spelling of an environment read of the database URL", () => {
    for (const code of [
      "process.env.DATABASE_URL",
      'process.env["TEST_DATABASE_URL"]',
      "process.env['DATABASE_URL']",
      "process.env?.DATABASE_URL",
      "import.meta.env.DATABASE_URL",
      'import.meta.env["DATABASE_URL"]',
      "const { DATABASE_URL } = process.env;",
      "const { A, TEST_DATABASE_URL: url } = import.meta.env;",
      "const env = process.env; env.DATABASE_URL",
      "deps.env.DATABASE_URL",
    ]) {
      expect(readsDatabaseUrl(code), code).toBe(true);
    }
    expect(readsDatabaseUrl('{ DATABASE_URL: "x" }')).toBe(false);
  });

  it("keeps test files off DATABASE_URL and TEST_DATABASE_URL", () => {
    // isolation.test.ts must read DATABASE_URL to prove the run's branch is a different host.
    const allowed = "test/integration/db/isolation.test.ts";
    const self = "test/unit/repo-layout.test.ts";
    const files = (readdirSync(join(root, "test"), { recursive: true }) as string[])
      .map((f) => `test/${f}`)
      .filter((f) => /\.tsx?$/.test(f) && f !== allowed && f !== self);
    const offenders = files.filter((f) => readsDatabaseUrl(read(f)));
    expect(offenders).toEqual([]);
  });

  it("docs describe Neon, not the old Postgres stack", () => {
    const banned = [
      "curriculum_test",
      "db.localtest.me",
      "TEST_DATABASE_URL",
      "local-neon-http-proxy",
      "Postgres 17",
    ];
    for (const file of ["RUNNING.md", "CLAUDE.md"]) {
      const text = read(file);
      for (const word of banned) {
        expect(text.includes(word), `${file} mentions ${word}`).toBe(false);
      }
      expect(text, `${file} mentions Neon Local`).toContain("Neon Local");
    }
  });
});
