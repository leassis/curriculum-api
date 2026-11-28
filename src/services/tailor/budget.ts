import { metaLine } from "../career/display.js";
import type { CareerItem } from "../career/item.js";
import type { PageSize } from "../settings-keys.js";
import { CHARS_PER_PAGE, LETTER_AREA_RATIO } from "./length.js";

/** Recency weights of the first five experiences; the sixth and older get none. */
const WEIGHTS = [1, 0.8, 0.6, 0.4, 0.2];
export const FALLBACK_BULLET_LENGTH = 120;

/** Mean bullet length over every bullet of the library; 120 when it has none. */
export function meanBulletLength(items: CareerItem[]): number {
  const bullets = items.flatMap((i) => i.bullets);
  if (bullets.length === 0) return FALLBACK_BULLET_LENGTH;
  return bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length;
}

/** Current first, then the latest end (year, then month), then the latest start. */
export function recency(a: CareerItem, b: CareerItem): number {
  if (a.current !== b.current) return a.current ? -1 : 1;
  const key = (i: CareerItem) => [
    i.endYear ?? 0,
    i.endMonth ?? 0,
    i.startYear ?? 0,
    i.startMonth ?? 0,
  ];
  const [ka, kb] = [key(a), key(b)];
  for (const [index, value] of ka.entries()) {
    const other = kb[index] ?? 0;
    if (value !== other) return other - value;
  }
  return 0;
}

/** Printed characters of the library that are not experience bullets. */
function fixedChars(items: CareerItem[]): number {
  return items.reduce((sum, i) => {
    const bullets = i.kind === "experience" ? 0 : i.bullets.reduce((n, b) => n + b.length, 0);
    return (
      sum +
      i.title.length +
      metaLine(i).length +
      i.text.length +
      i.skills.join(", ").length +
      bullets
    );
  }, 0);
}

/**
 * The bullet cap of every experience, by item id. The experience bullet budget is the target
 * pages' characters less everything else the library prints; each role takes its recency weight's
 * share of it, in bullets of the library's mean length, never above the bullets it has.
 */
export function bulletCaps(
  library: CareerItem[],
  targetPages: number,
  pageSize: PageSize,
): Map<string, number> {
  const ratio = pageSize === "Letter" ? LETTER_AREA_RATIO : 1;
  const budget = Math.max(0, targetPages * CHARS_PER_PAGE * ratio - fixedChars(library));
  const mean = meanBulletLength(library);
  const roles = library.filter((i) => i.kind === "experience").sort(recency);
  const total = roles.reduce((sum, _, index) => sum + (WEIGHTS[index] ?? 0), 0);
  return new Map(
    roles.map((role, index) => {
      const share = total === 0 ? 0 : (WEIGHTS[index] ?? 0) / total;
      return [role.id, Math.min(role.bullets.length, Math.floor((share * budget) / mean))];
    }),
  );
}
