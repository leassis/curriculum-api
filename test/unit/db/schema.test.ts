import { getTableName, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import drizzleConfig from "../../../drizzle.config";
import * as schema from "../../../src/db/schema";

describe("drizzle config", () => {
  it("targets curriculum_api with snake_case", () => {
    expect(drizzleConfig).toMatchObject({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      schemaFilter: ["curriculum_api"],
      casing: "snake_case",
      migrations: { schema: "curriculum_api" },
    });
  });
});

describe("schema", () => {
  it("declares seven tables in curriculum_api", () => {
    const tables = Object.values(schema).filter((v) => is(v, PgTable));
    expect(tables.map((t) => getTableName(t)).sort()).toEqual([
      "admin_login_attempts",
      "personal_info",
      "profile",
      "public_usage",
      "recruiter_chats",
      "settings",
      "tailored_resumes",
    ]);
    for (const t of tables) expect(getTableConfig(t).schema).toBe("curriculum_api");
  });
});
