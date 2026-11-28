import { describe, expect, it } from "vitest";
import type { CareerItem } from "../../../../src/services/career/item";
import {
  bulletCaps,
  FALLBACK_BULLET_LENGTH,
  meanBulletLength,
} from "../../../../src/services/tailor/budget";
import { item } from "../../../support/career";

const bullets = (n: number) => Array.from({ length: n }, () => "x".repeat(100));
const role = (overrides: Partial<CareerItem> = {}) =>
  item("experience", { bullets: bullets(30), ...overrides });

/** Six roles listed oldest first, so the input order is not the recency order. */
function sixRoles() {
  return [2015, 2016, 2017, 2018, 2019, 2020].map((year) =>
    role({ title: "Engineer", startYear: year - 1, endYear: year, endMonth: 6 }),
  );
}

describe("bulletCaps", () => {
  it("weights experiences by recency", () => {
    const roles = sixRoles();
    const caps = bulletCaps(roles, 3, "A4");
    // 3 pages = 7020 chars less 180 printed outside experience bullets, mean bullet 100, weights
    // 1, 0.8, 0.6, 0.4, 0.2, 0 from the newest end year down.
    const newestFirst = [...roles].reverse().map((r) => caps.get(r.id));
    expect(newestFirst).toEqual([22, 18, 13, 9, 4, 0]);
  });

  it("ranks a current role first, then by end year and month", () => {
    const old = role({ endYear: 2020, endMonth: 3 });
    const later = role({ endYear: 2020, endMonth: 11 });
    const current = role({ startYear: 2010, current: true });
    const caps = bulletCaps([old, later, current], 3, "A4");
    const capOf = (r: CareerItem) => caps.get(r.id) as number;
    expect(capOf(current)).toBeGreaterThan(capOf(later));
    expect(capOf(later)).toBeGreaterThan(capOf(old));
  });

  it("never caps above the library bullet count", () => {
    const few = role({ bullets: bullets(2), current: true, startYear: 2022 });
    const caps = bulletCaps([few, ...sixRoles()], 3, "A4");
    expect(caps.get(few.id)).toBe(2);
  });

  it("uses 120 characters when the library has no bullets", () => {
    const roles = [item("experience"), item("project")];
    expect(meanBulletLength(roles)).toBe(FALLBACK_BULLET_LENGTH);
    expect(FALLBACK_BULLET_LENGTH).toBe(120);
    expect(bulletCaps(roles, 2, "A4").get(roles[0]?.id as string)).toBe(0);
  });

  it("gives a Letter resume the A4 budget scaled by printable area", () => {
    const roles = sixRoles();
    const a4 = bulletCaps(roles, 3, "A4");
    const letter = bulletCaps(roles, 3, "Letter");
    const newest = roles[5]?.id as string;
    expect(letter.get(newest) as number).toBeLessThan(a4.get(newest) as number);
  });
});
