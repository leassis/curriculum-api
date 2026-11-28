import type { PageSize } from "../settings-keys.js";
import { recency } from "./budget.js";
import type { ResumeDocument, ResumeItem } from "./document.js";
import { estimatePages } from "./length.js";

export interface Fitted {
  doc: ResumeDocument;
  /** Estimated printed pages of `doc`. */
  estimate: number;
}

/**
 * Cuts bullets until the document's estimate fits its target pages: first every experience to its
 * cap, then, while still over, project bullets, then experience bullets from the oldest role to the
 * newest. The last bullet goes first, because the model orders them most relevant first. Every item
 * stays, with no bullets at the least; a document still over with none left is returned as it is.
 */
export function fitToBudget(
  doc: ResumeDocument,
  caps: Map<string, number>,
  targetPages: number,
  pageSize: PageSize,
): Fitted {
  const items: ResumeItem[] = doc.items.map((item) => {
    const cap = item.kind === "experience" && item.sourceId ? caps.get(item.sourceId) : undefined;
    return cap === undefined ? item : { ...item, bullets: item.bullets.slice(0, cap) };
  });
  const current = (): ResumeDocument => ({ ...doc, items });
  const drop = (index: number) => {
    const item = items[index] as ResumeItem;
    items[index] = { ...item, bullets: item.bullets.slice(0, -1) };
  };
  const withBullets = (kind: ResumeItem["kind"]) =>
    items.flatMap((item, index) => (item.kind === kind && item.bullets.length ? [index] : []));
  const oldestFirst = () =>
    withBullets("experience").sort((a, b) =>
      recency(items[b] as ResumeItem, items[a] as ResumeItem),
    );

  let estimate = estimatePages(current(), pageSize);
  while (estimate > targetPages) {
    const index = withBullets("project").pop() ?? oldestFirst()[0];
    if (index === undefined) break;
    drop(index);
    estimate = estimatePages(current(), pageSize);
  }
  return { doc: current(), estimate };
}
