import { describe, expect, it } from "vitest";
import { closeDb, createDb } from "../../../src/db/client";

describe("db client", () => {
  it("builds a pooled db without opening a connection", async () => {
    const db = createDb("postgres://postgres:postgres@localhost:5432/never_connected");
    expect(typeof db.select).toBe("function");
    expect(db.$client.totalCount).toBe(0);
    await closeDb(db);
  });
});
