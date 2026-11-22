import { Marked, type TokenizerObject } from "marked";

const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "code",
  "pre",
  "blockquote",
  "hr",
  "br",
]);
const VOID_TAGS = new Set(["hr", "br"]);
const SAFE_HREF = /^(https?:|mailto:)/i;

/** Raw HTML never becomes a token: marked then treats it as plain text and escapes it. */
const noRawHtml: TokenizerObject = {
  html: () => undefined,
  tag: () => undefined,
};

const marked = new Marked({ gfm: true, async: false });
marked.use({ tokenizer: noRawHtml });

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const decodeEntities = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function hrefOf(attrs: string): string | null {
  const m = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  const raw = m?.[1] ?? m?.[2];
  if (raw === undefined) return null;
  // Control characters and whitespace inside a scheme are an old filter-bypass trick.
  const href = [...decodeEntities(raw)]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x20 && (code < 0x7f || code > 0x9f);
    })
    .join("");
  return SAFE_HREF.test(href) ? href : null;
}

/** Keeps allowlisted tags without attributes (`a` keeps a safe href) and drops every other tag. */
function sanitize(html: string): string {
  return html.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    (_, slash, name, attrs) => {
      const tag = String(name).toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (slash) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      if (tag === "a") {
        const href = hrefOf(attrs);
        return href === null ? "<a>" : `<a href="${escapeAttr(href)}">`;
      }
      return `<${tag}>`;
    },
  );
}

/** Markdown to HTML that is safe to inject: no raw HTML, only allowlisted tags and attributes. */
export function renderMarkdown(markdown: string): string {
  return sanitize(marked.parse(markdown) as string);
}
