import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown";

const ALLOWED = new Set([
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

function tagsAndAttrs(html: string) {
  const out: { tag: string; attrs: string }[] = [];
  for (const m of html.matchAll(/<\/?([a-zA-Z0-9]+)([^>]*)>/g)) {
    out.push({ tag: (m[1] as string).toLowerCase(), attrs: (m[2] as string).trim() });
  }
  return out;
}

describe("markdown", () => {
  it("turns a script tag into text and keeps the markdown around it", () => {
    const html = renderMarkdown("<script>alert(1)</script>**x**");
    expect(html).toContain("<strong>x</strong>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("</script");
  });

  it("leaves no element or attribute outside the allowlist", () => {
    const html = renderMarkdown(
      [
        "<img src=x onerror=alert(1)>",
        "",
        '<div onclick="x()" style="color:red">hi</div>',
        "",
        '<a href="https://ok.example" onclick="x()" target="_blank">link</a>',
        "",
        "![alt](http://x.example/i.png)",
        "",
        "<iframe src=//evil></iframe><svg onload=alert(1)>",
      ].join("\n"),
    );
    for (const { tag, attrs } of tagsAndAttrs(html)) {
      expect(ALLOWED.has(tag)).toBe(true);
      if (tag !== "a") expect(attrs).toBe("");
      else expect(attrs).toMatch(/^(href="[^"]*")?$/);
    }
    expect(html).not.toMatch(/<(img|iframe|svg|div)/i);
  });

  it("keeps only http, https and mailto links", () => {
    const html = renderMarkdown(
      [
        "[a](javascript:alert(1))",
        "[b](JaVaScRiPt:alert(1))",
        "[c](data:text/html;base64,AAAA)",
        "[d](https://ok.example/p?q=1&r=2)",
        "[e](http://ok.example)",
        "[f](mailto:me@ok.example)",
        "[g](vbscript:x)",
        "[h](java&#x09;script:alert(1))",
      ].join("\n\n"),
    );
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      "https://ok.example/p?q=1&amp;r=2",
      "http://ok.example",
      "mailto:me@ok.example",
    ]);
    expect(html).not.toMatch(/javascript:|data:|vbscript:/i);
    expect(html).toContain("<a>a</a>");
  });

  it("renders headings, lists, emphasis, code and quotes", () => {
    const html = renderMarkdown(
      "# T\n\n## S\n\n- one\n- two\n\n1. a\n\n*em* **st** `c`\n\n> q\n\n```\nblock\n```\n\n---\n",
    );
    for (const frag of [
      "<h1>T</h1>",
      "<h2>S</h2>",
      "<ul>",
      "<li>one</li>",
      "<ol>",
      "<em>em</em>",
      "<strong>st</strong>",
      "<code>c</code>",
      "<blockquote>",
      "<pre>",
      "<hr>",
    ]) {
      expect(html).toContain(frag);
    }
  });
});
