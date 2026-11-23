import type { CareerItem } from "./item";

export type Direction = "up" | "down";

export function addItem<T extends CareerItem>(items: T[], item: T): T[] {
  return [...items, item];
}

export function replaceItem<T extends CareerItem>(items: T[], id: string, item: T): T[] | null {
  const index = items.findIndex((i) => i.id === id);
  if (index < 0) return null;
  return items.map((existing, i) => (i === index ? item : existing));
}

export function removeItem<T extends CareerItem>(items: T[], id: string): T[] | null {
  if (!items.some((i) => i.id === id)) return null;
  return items.filter((i) => i.id !== id);
}

export function moveItem<T extends CareerItem>(
  items: T[],
  id: string,
  direction: Direction,
): T[] | null {
  const index = items.findIndex((i) => i.id === id);
  const current = items[index];
  if (!current) return null;
  const step = direction === "up" ? -1 : 1;
  let neighbour = index + step;
  while (items[neighbour] && items[neighbour]?.kind !== current.kind) neighbour += step;
  if (!items[neighbour]) return [...items];
  const moved = [...items];
  moved[index] = items[neighbour] as T;
  moved[neighbour] = current;
  return moved;
}
