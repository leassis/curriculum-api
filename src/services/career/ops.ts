import type { CareerItem } from "./item";

export type Direction = "up" | "down";

export function addItem(items: CareerItem[], item: CareerItem): CareerItem[] {
  return [...items, item];
}

export function replaceItem(
  items: CareerItem[],
  id: string,
  item: CareerItem,
): CareerItem[] | null {
  const index = items.findIndex((i) => i.id === id);
  if (index < 0) return null;
  return items.map((existing, i) => (i === index ? item : existing));
}

export function removeItem(items: CareerItem[], id: string): CareerItem[] | null {
  if (!items.some((i) => i.id === id)) return null;
  return items.filter((i) => i.id !== id);
}

export function moveItem(
  items: CareerItem[],
  id: string,
  direction: Direction,
): CareerItem[] | null {
  const index = items.findIndex((i) => i.id === id);
  const current = items[index];
  if (!current) return null;
  const step = direction === "up" ? -1 : 1;
  let neighbour = index + step;
  while (items[neighbour] && items[neighbour]?.kind !== current.kind) neighbour += step;
  if (!items[neighbour]) return [...items];
  const moved = [...items];
  moved[index] = items[neighbour] as CareerItem;
  moved[neighbour] = current;
  return moved;
}
