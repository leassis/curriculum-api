import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  dts: true,
  clean: true,
  // Keep .js / .d.ts (not .mjs / .d.mts) so package.json main, types and bin stay valid.
  fixedExtension: false,
});
