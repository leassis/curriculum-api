import { describe, expect, it } from "vitest";
import { resumeApp } from "../../support/resumes";

async function printCss() {
  const { get } = await withResume();
  const html = await (await get("/admin/profile/print")).text();
  return { html, css: html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "" };
}

async function withResume() {
  const setup = await resumeApp();
  const { id } = await setup.resumes.create({ title: "Backend", jobDescription: "jd" });
  return { ...setup, id };
}

/** The declarations of every top-level rule whose selector is exactly `selector`, joined. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`, "g");
  return [...css.matchAll(re)].map((m) => m[1]).join(" ");
}

describe("admin print style", () => {
  it("sets Arial 10pt with line height 1.35 in black", async () => {
    const { css } = await printCss();
    const body = rule(css, "body");
    expect(body).toContain("font-family: Arial, Helvetica, sans-serif");
    expect(body).toContain("font-size: 10pt");
    expect(body).toContain("line-height: 1.35");
    expect(body).toContain("color: #000;");
  });

  it("centres the name at 22pt and the contact list in grey", async () => {
    const { css } = await printCss();
    const h1 = rule(css, "h1");
    expect(h1).toContain("font-size: 22pt");
    expect(h1).toContain("font-weight: bold");
    expect(h1).toContain("color: #2c3e50");
    expect(h1).toContain("text-align: center");
    const contact = rule(css, "ul.contact");
    expect(contact).toContain("justify-content: center");
    expect(contact).toContain("color: #555555");
  });

  it("styles h2 as uppercase, h3 and the line under it", async () => {
    const { css } = await printCss();
    const h2 = rule(css, "h2");
    for (const d of [
      "font-size: 12pt",
      "font-weight: bold",
      "color: #2c3e50",
      "text-transform: uppercase",
      "text-align: left",
    ]) {
      expect(h2).toContain(d);
    }
    const h3 = rule(css, "h3");
    for (const d of ["font-size: 12pt", "font-weight: bold", "color: #000", "text-align: left"]) {
      expect(h3).toContain(d);
    }
    const date = rule(css, "h3 + p");
    expect(date).toContain("font-style: italic");
    expect(date).toContain("color: #7f8c8d");
  });

  it("keeps the page rule for A4 and Letter on both print pages", async () => {
    const { get, id, settingsRepo } = await withResume();
    const pages = ["/admin/profile/print", `/admin/resumes/${id}/print`];
    for (const url of pages) {
      expect(await (await get(url)).text()).toContain("@page { size: A4; margin: 16mm 18mm; }");
    }
    settingsRepo.rows["print.pageSize"] = "Letter";
    for (const url of pages) {
      expect(await (await get(url)).text()).toContain("@page { size: Letter; margin: 16mm 18mm; }");
    }
  });

  it("keeps headings with the content after them", async () => {
    const { css } = await printCss();
    expect(rule(css, "h1, h2, h3, h4, h5, h6")).toContain("break-after: avoid");
    const date = rule(css, "h3 + p");
    expect(date).toContain("break-before: avoid");
    expect(date).toContain("break-after: avoid");
  });

  it("never splits a block and keeps three lines at page edges", async () => {
    const { css } = await printCss();
    const blocks = rule(css, "p, li, ul, ol, table, tr, blockquote, pre, img");
    expect(blocks).toContain("break-inside: avoid");
    const paragraph = rule(css, "p");
    expect(paragraph).toContain("orphans: 3");
    expect(paragraph).toContain("widows: 3");
  });

  it("asks the browser to print colours exactly", async () => {
    const { css } = await printCss();
    const body = rule(css, "body");
    expect(body).toContain("print-color-adjust: exact");
    expect(body).toContain("-webkit-print-color-adjust: exact");
  });
});
