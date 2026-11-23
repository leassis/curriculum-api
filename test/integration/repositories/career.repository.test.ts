import { beforeEach, describe, expect, it } from "vitest";
import { CareerRepository } from "../../../src/repositories/career.repository";
import type { CareerItem, CareerLibrary } from "../../../src/services/career/item";
import { moveItem } from "../../../src/services/career/ops";
import { item } from "../../support/career";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new CareerRepository(db);

const move =
  (id: string, direction: "up" | "down") =>
  (current: unknown): CareerLibrary => {
    const library = current as CareerLibrary;
    return { ...library, items: moveItem(library.items, id, direction) as CareerItem[] };
  };

describe("career repository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("answers an empty library on a fresh database", async () => {
    expect(await repo.get()).toEqual({ version: 1, items: [] });
  });

  it("stores what update returns and reads it back", async () => {
    const stored = item("experience", { title: "Staff" });
    const returned = await repo.update((current) => ({
      ...(current as CareerLibrary),
      items: [stored],
    }));
    expect(returned).toEqual({ version: 1, items: [stored] });
    expect(await repo.get()).toEqual({ version: 1, items: [stored] });
  });

  it("applies concurrent updates in sequence", async () => {
    const [e1, e2] = [item("experience", { title: "E1" }), item("experience", { title: "E2" })];
    const [d1, d2] = [item("education", { title: "D1" }), item("education", { title: "D2" })];
    await repo.update(() => ({ version: 1, items: [e1, e2, d1, d2] }));

    await Promise.all([repo.update(move(e1.id, "down")), repo.update(move(d1.id, "down"))]);

    const library = (await repo.get()) as CareerLibrary;
    expect(library.items.map((i) => i.title)).toEqual(["E2", "E1", "D2", "D1"]);
    expect(new Set(library.items.map((i) => i.id)).size).toBe(4);
  });
});
