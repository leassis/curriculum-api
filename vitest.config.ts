import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts", "test/unit/**/*.test.tsx"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          fileParallelism: false,
          globalSetup: ["test/support/global-setup.ts"],
        },
      },
    ],
  },
});
