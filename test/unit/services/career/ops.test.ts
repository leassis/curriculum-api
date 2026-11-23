import { describe, expect, it } from "vitest";
import {
  addItem,
  leftOut,
  moveItem,
  removeItem,
  replaceItem,
} from "../../../../src/services/career/ops";
import { item } from "../../../support/career";

const titles = (items: { title: string }[] | null) => items?.map((i) => i.title);

describe("career ops", () => {
  const a = item("experience", { title: "A" });
  const b = item("experience", { title: "B" });
  const c = item("experience", { title: "C" });
  const edu = item("education", { title: "E" });

  it("adds an item at the end", () => {
    expect(titles(addItem([a, edu], b))).toEqual(["A", "E", "B"]);
  });

  it("replaces and removes by id", () => {
    const changed = { ...b, title: "B2" };
    expect(titles(replaceItem([a, b, c], b.id, changed))).toEqual(["A", "B2", "C"]);
    expect(titles(removeItem([a, b, c], b.id))).toEqual(["A", "C"]);
  });

  it("answers null for an unknown id", () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(replaceItem([a], missing, b)).toBeNull();
    expect(removeItem([a], missing)).toBeNull();
    expect(moveItem([a], missing, "up")).toBeNull();
  });

  it("moves an item past its neighbour of the same kind", () => {
    expect(titles(moveItem([a, b, c], b.id, "up"))).toEqual(["B", "A", "C"]);
    expect(titles(moveItem([a, b, c], b.id, "down"))).toEqual(["A", "C", "B"]);
  });

  it("skips items of other kinds when moving", () => {
    const list = [a, edu, b, c];
    expect(titles(moveItem(list, b.id, "up"))).toEqual(["B", "E", "A", "C"]);
    expect(titles(moveItem(list, a.id, "down"))).toEqual(["B", "E", "A", "C"]);
    expect(titles(moveItem([edu, a, b], a.id, "up"))).toEqual(["E", "A", "B"]);
  });

  it("does nothing for the first item up and the last item down", () => {
    expect(titles(moveItem([a, edu, b], a.id, "up"))).toEqual(["A", "E", "B"]);
    expect(titles(moveItem([a, edu, b], b.id, "down"))).toEqual(["A", "E", "B"]);
  });

  it("keeps the only item of a kind in place", () => {
    expect(titles(moveItem([a, edu, b], edu.id, "up"))).toEqual(["A", "E", "B"]);
    expect(titles(moveItem([a, edu, b], edu.id, "down"))).toEqual(["A", "E", "B"]);
  });

  it("does not change the list it is given", () => {
    const list = [a, b];
    moveItem(list, b.id, "up");
    removeItem(list, a.id);
    expect(titles(list)).toEqual(["A", "B"]);
  });
});

describe("left out", () => {
  const a = item("experience", { title: "A" });
  const b = item("education", { title: "B" });
  const c = item("course", { title: "C" });

  it("lists the library items no document item points at", () => {
    const doc = [{ sourceId: b.id }];
    expect(titles(leftOut([a, b, c], doc))).toEqual(["A", "C"]);
  });

  it("ignores items without a source id", () => {
    expect(titles(leftOut([a, b], [{ sourceId: null }]))).toEqual(["A", "B"]);
  });

  it("returns an item to left out once its document item is removed", () => {
    const doc = [{ sourceId: a.id }, { sourceId: b.id }];
    expect(titles(leftOut([a, b], doc))).toEqual([]);
    expect(titles(leftOut([a, b], doc.slice(1)))).toEqual(["A"]);
  });
});
