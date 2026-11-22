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

    const composeFile = parse(read("docker-compose.yml"));
    expect(Object.keys(composeFile.services).sort()).toEqual(["db", "neon-proxy"]);
    expect(composeFile.services.db.image).toBe("postgres:17");
  });

  it("env example documents every variable", () => {
    const lines = read(".env.example").split("\n");
    const variables = [
      "DATABASE_URL",
      "OPENROUTER_API_KEY",
      "SESSION_SECRET",
      "TURNSTILE_SECRET",
      "ADMIN_PASSWORD_HASH",
      "IP_HASH_SALT",
      "PII_ENCRYPTION_KEY",
      "MODEL_PUBLIC",
      "MODEL_TAILOR",
      "MODEL_RECRUITER",
      "TEST_DATABASE_URL",
    ];
    for (const name of variables) {
      const index = lines.findIndex((l) => l.startsWith(`${name}=`));
      expect(index, name).toBeGreaterThan(0);
      expect(lines[index - 1]?.startsWith("# "), `${name} has a comment`).toBe(true);
    }
  });

  it("ships the init migration and the transcripts migration", () => {
    const sql = readdirSync(join(root, "drizzle")).filter((f) => f.endsWith(".sql"));
    expect(sql).toEqual([
      "0000_init.sql",
      "0001_demonic_winter_soldier.sql",
      "0002_crazy_lake.sql",
    ]);
    const journal = JSON.parse(read("drizzle/meta/_journal.json"));
    expect(journal.entries).toHaveLength(3);
    expect(JSON.parse(read("package.json")).files).toContain("drizzle");
  });
});
