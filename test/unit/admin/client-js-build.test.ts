import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClients } from "../../../scripts/build-js";

const root = join(import.meta.dirname, "../../..");

describe("admin client scripts", () => {
  it("keeps the generated modules in sync with their client.ts sources", async () => {
    for (const [path, text] of await buildClients()) {
      expect(readFileSync(join(root, path), "utf8"), `${path}: run pnpm build:js`).toBe(text);
    }
  });

  it("never builds html or uses inline script", async () => {
    for (const text of (await buildClients()).values()) {
      for (const banned of ["insertAdjacentHTML", "outerHTML", "document.write", "eval("]) {
        expect(text).not.toContain(banned);
      }
    }
  });
});
