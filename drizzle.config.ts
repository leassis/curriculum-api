import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["curriculum_api"],
  casing: "snake_case",
  migrations: { schema: "curriculum_api", table: "__drizzle_migrations" },
});
