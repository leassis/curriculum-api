import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export interface Violation {
  file: string;
  message: string;
}

interface Import {
  specifier: string;
  dynamic: boolean;
}

const STATIC_IMPORT =
  /(?:^|[\n;])\s*(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

function listSources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSources(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function importsOf(source: string): Import[] {
  const found: Import[] = [];
  for (const m of source.matchAll(STATIC_IMPORT))
    found.push({ specifier: m[1] as string, dynamic: false });
  for (const m of source.matchAll(DYNAMIC_IMPORT))
    found.push({ specifier: m[1] as string, dynamic: true });
  return found;
}

/** Resolve a relative specifier to a posix path under src, without extension. */
function resolveTarget(fromFile: string, specifier: string): string {
  const joined = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  return joined.replace(/\.(js|ts|tsx)$/, "");
}

const PLATFORM = /^(@vercel\/|aws-sdk$|@aws-sdk\/)/;
const PROVIDER_PKG = "@openrouter/ai-sdk-provider";
const DATA_LAYERS = ["db/", "repositories/"];
const UI_LAYERS = ["routes/", "admin/", "middleware/"];
const PROVIDER_FILE = "llm/openrouter";
const PROVIDER_IMPORTERS = new Set(["services/llm.service.ts", "container.ts"]);

export function checkArchitecture(root: string): Violation[] {
  const srcDir = resolve(root, "src");
  const violations: Violation[] = [];
  for (const abs of listSources(srcDir)) {
    const file = relative(srcDir, abs).split(sep).join("/");
    const report = (message: string) => violations.push({ file: `src/${file}`, message });
    for (const imp of importsOf(readFileSync(abs, "utf8"))) {
      const spec = imp.specifier;
      if (!spec.startsWith(".")) {
        if (PLATFORM.test(spec)) report(`imports platform package ${spec}`);
        if (spec === PROVIDER_PKG && file !== `${PROVIDER_FILE}.ts`) {
          report(`imports ${PROVIDER_PKG} outside src/llm/openrouter.ts`);
        }
        continue;
      }
      const target = resolveTarget(file, spec);
      if (
        UI_LAYERS.some((l) => file.startsWith(l)) &&
        DATA_LAYERS.some((l) => target.startsWith(l))
      ) {
        report(`imports ${spec}: routes, admin and middleware must not import db or repositories`);
      }
      if (target === PROVIDER_FILE && !PROVIDER_IMPORTERS.has(file)) {
        report("imports src/llm/openrouter.ts outside the llm service and the container");
      }
      if (file === "app.ts" && !imp.dynamic && target.startsWith("admin/")) {
        report(`statically imports ${spec}: src/app.ts must load src/admin/ with import()`);
      }
    }
  }
  return violations;
}

const entry = process.argv[1];
if (entry && resolve(entry) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const violations = checkArchitecture(root);
  for (const v of violations) console.error(`${v.file}: ${v.message}`);
  if (violations.length > 0) process.exit(1);
}
