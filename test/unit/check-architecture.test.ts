import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkArchitecture } from "../../scripts/check-architecture";

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "arch-"));
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, "src", path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

describe("check-architecture", () => {
  it("rejects routes, admin and middleware importing db or repositories", () => {
    const root = tree({
      "routes/a.ts": 'import { db } from "../db/client.js";\n',
      "admin/b.tsx": 'import { ProfileRepository } from "../repositories/profile.repository.js";\n',
      "middleware/c.ts": 'import type { Db } from "../db/client";\n',
      "services/ok.ts": 'import { db } from "../db/client.js";\n',
      "routes/clean.ts": 'import { x } from "../services/x.js";\n',
    });
    const files = checkArchitecture(root)
      .map((v) => v.file)
      .sort();
    expect(files).toEqual(["src/admin/b.tsx", "src/middleware/c.ts", "src/routes/a.ts"]);
  });

  it("rejects platform imports in src", () => {
    const root = tree({
      "a.ts": 'import { kv } from "@vercel/kv";\n',
      "b.ts": 'import aws from "aws-sdk";\n',
      "c.ts": 'import { S3 } from "@aws-sdk/client-s3";\n',
      "d.ts": 'import { Hono } from "hono";\n',
    });
    const violations = checkArchitecture(root);
    expect(violations.map((v) => v.file).sort()).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(violations[0]?.message).toMatch(/platform package/);
  });

  it("only the llm service imports the provider", () => {
    const root = tree({
      "llm/openrouter.ts": 'import { createOpenRouter } from "@openrouter/ai-sdk-provider";\n',
      "services/llm.service.ts": 'import { createProvider } from "../llm/openrouter.js";\n',
      "container.ts": 'import { createProvider } from "./llm/openrouter.js";\n',
      "routes/bad.ts": 'import { createProvider } from "../llm/openrouter.js";\n',
      "services/other.ts": 'import { createOpenRouter } from "@openrouter/ai-sdk-provider";\n',
    });
    const files = checkArchitecture(root)
      .map((v) => v.file)
      .sort();
    expect(files).toEqual(["src/routes/bad.ts", "src/services/other.ts"]);
  });

  it("rejects a static admin import in app", () => {
    const root = tree({
      "app.ts": 'import { adminRouter } from "./admin/index.js";\n',
      "admin/index.tsx": "export const adminRouter = 1;\n",
    });
    expect(checkArchitecture(root).map((v) => v.file)).toEqual(["src/app.ts"]);
    const lazy = tree({
      "app.ts": 'const load = () => import("./admin/index.js");\n',
      "admin/index.tsx": "export const adminRouter = 1;\n",
    });
    expect(checkArchitecture(lazy)).toEqual([]);
  });

  it("keeps admin view files free of services, repositories, security, db and llm", () => {
    const root = tree({
      "admin/profile/view.tsx": 'import type { X } from "../../services/x.js";\n',
      "admin/chats/view.tsx": 'import { y } from "../../security/y.js";\n',
      "admin/chats/messages/view.tsx": 'import { z } from "../../../llm/z.js";\n',
      "admin/layout.tsx": 'import { r } from "../repositories/r.js";\n',
      "admin/login/view.tsx": 'import { w } from "../../db/client.js";\n',
      "admin/settings/view.tsx": 'import { Layout } from "../layout.js";\n',
      "admin/settings/routes.ts": 'import { s } from "../../services/s.js";\n',
    });
    const files = [...new Set(checkArchitecture(root).map((v) => v.file))].sort();
    expect(files).toEqual([
      "src/admin/chats/messages/view.tsx",
      "src/admin/chats/view.tsx",
      "src/admin/layout.tsx",
      "src/admin/login/view.tsx",
      "src/admin/profile/view.tsx",
    ]);
  });
});
