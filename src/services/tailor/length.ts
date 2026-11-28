import { groupByKind, metaLine } from "../career/display.js";
import type { CareerItem } from "../career/item.js";
import type { PageSize } from "../settings-keys.js";
import type { ResumeDocument } from "./document.js";

/**
 * A line-based estimate of a resume's printed length, calibrated once on the print view at A4
 * (spec `tailor-length-budget`, `## Measurement`). Each block costs whole lines of its measured
 * characters per line, plus the margin that survives collapsing against its neighbour.
 */

const PT_MM = 25.4 / 72;
const LINE_MM = 4.762;
const HEADING_LINE_MM = 5.08;

export const PAGE_HEIGHT_MM = 265;
export const CHARS_PER_LINE_PARAGRAPH = 108;
export const CHARS_PER_LINE_BULLET = 104;
/** Heading text is 12pt against 10pt body text. */
const CHARS_PER_LINE_HEADING = 90;
const HEADER_ALLOWANCE_MM = 22.2;
const PAGE_BREAK_WASTE = 1.04;
/** Letter's printable area (179.9 x 247.4mm) over A4's (174 x 265mm). */
const LETTER_AREA_RATIO = 0.965;
/** Average printed characters per A4 page for this resume's mix of blocks. */
export const CHARS_PER_PAGE = 2340;

interface Block {
  lines: number;
  heading?: boolean;
  /** Margins in pt; they collapse against the neighbour's margin to the larger of the two. */
  top: number;
  bottom: number;
}

const linesOf = (text: string, perLine: number): number =>
  Math.max(
    1,
    text.split("\n").reduce((n, line) => n + Math.ceil(line.length / perLine), 0),
  );

const paragraph = (text: string): Block => ({
  lines: linesOf(text, CHARS_PER_LINE_PARAGRAPH),
  top: 0,
  bottom: 6,
});

/** The paragraph right after an item title is styled as its meta line. */
const metaParagraph = (text: string): Block => ({ ...paragraph(text), top: 1, bottom: 5 });

function itemBlocks(item: CareerItem): Block[] {
  const blocks: Block[] = [
    {
      lines: linesOf(item.title, CHARS_PER_LINE_HEADING),
      heading: true,
      top: 12,
      bottom: 0,
    },
  ];
  const paragraphs: string[] = [];
  if (item.kind === "skill_group") {
    paragraphs.push(item.skills.join(", "));
  } else {
    const meta = metaLine(item);
    if (meta) paragraphs.push(meta);
    if (item.text) paragraphs.push(item.text);
  }
  paragraphs.forEach((text, index) => {
    blocks.push(index === 0 ? metaParagraph(text) : paragraph(text));
  });
  item.bullets.forEach((bullet, index) => {
    blocks.push({
      lines: linesOf(bullet, CHARS_PER_LINE_BULLET),
      top: 0,
      bottom: index === item.bullets.length - 1 ? 6 : 3,
    });
  });
  if (item.kind !== "skill_group" && item.skills.length) {
    blocks.push(paragraph(`Stack: ${item.skills.join(", ")}`));
  }
  return blocks;
}

function blocksOf(doc: ResumeDocument): Block[] {
  const blocks: Block[] = [];
  if (doc.headline.trim()) blocks.push(paragraph(doc.headline.trim()));
  if (doc.summary.trim()) blocks.push(paragraph(doc.summary.trim()));
  for (const group of groupByKind(doc.items)) {
    if (!group.items.length) continue;
    blocks.push({ lines: 1, heading: true, top: 14, bottom: 5 });
    for (const item of group.items) blocks.push(...itemBlocks(item));
  }
  return blocks;
}

function heightMm(block: Block): number {
  return block.lines * (block.heading ? HEADING_LINE_MM : LINE_MM);
}

/** Estimated printed pages of a Resume Document at a page size. */
export function estimatePages(doc: ResumeDocument, pageSize: PageSize): number {
  const blocks = blocksOf(doc);
  let mm = HEADER_ALLOWANCE_MM;
  blocks.forEach((block, index) => {
    mm += heightMm(block);
    const next = blocks[index + 1];
    if (next) mm += Math.max(block.bottom, next.top) * PT_MM;
    else mm += block.bottom * PT_MM;
  });
  const pages = (mm * PAGE_BREAK_WASTE) / PAGE_HEIGHT_MM;
  return pageSize === "Letter" ? pages / LETTER_AREA_RATIO : pages;
}
