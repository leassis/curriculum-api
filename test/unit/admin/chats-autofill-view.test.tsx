import { describe, expect, it } from "vitest";
import { AutofillFragment, ChatsPage } from "../../../src/admin/chats/view";
import { button, decode, tags, voidTags } from "../../support/html";

const fragment = (overrides: Partial<Parameters<typeof AutofillFragment>[0]> = {}) =>
  String(
    <AutofillFragment
      basePath=""
      jobDescriptionShort="- Postgres <b>"
      company="Acme"
      lastJobDescriptionShort="- Postgres <b>"
      lastCompany="Acme"
      jobDescriptionNotice={null}
      companyNotice={null}
      {...overrides}
    />,
  );

const page = () =>
  String(
    <ChatsPage
      basePath=""
      origin="http://localhost"
      chats={[]}
      resumes={[{ id: "00000000-0000-4000-8000-000000000042", title: "Backend" }]}
      defaultMax={10}
      counts={{ activeChats: 0, publicQuestionsToday: 0 }}
    />,
  );

describe("chat autofill fragment", () => {
  it("renders notices in a polite live region", () => {
    const html = page();
    expect(html).toContain('<div id="jd-notice" aria-live="polite"></div>');
    expect(html).toContain('<div id="company-notice" aria-live="polite"></div>');

    const both = fragment({ jobDescriptionNotice: "kept", companyNotice: "kept" });
    const swaps = tags(both, "div").map((d) => d.attrs["hx-swap-oob"]);
    expect(swaps).toEqual(["innerHTML:#jd-notice", "innerHTML:#company-notice"]);
  });

  it("shows each notice text and a Replace button that posts the field", () => {
    const kept = fragment({ jobDescriptionNotice: "kept", companyNotice: "kept" });
    expect(decode(kept)).toContain("Not filled: the field has your own text.");
    const replaces = tags(kept, "button").filter((b) => b.text === "Replace");
    expect(replaces.map((b) => JSON.parse(decode(b.attrs["hx-vals"] ?? "")))).toEqual([
      { replace: "jobDescriptionShort" },
      { replace: "company" },
    ]);
    for (const b of replaces) {
      expect(b.attrs["hx-post"]).toBe("/admin/chats/autofill");
      expect(b.attrs["hx-include"]).toBe("closest form");
    }

    const none = fragment({ jobDescriptionNotice: "no-source" });
    expect(decode(none)).toContain(
      "This resume has no short description yet. Regenerate it to get one.",
    );
    expect(tags(none, "button")).toEqual([]);

    const missing = fragment({ jobDescriptionNotice: "not-found" });
    expect(decode(missing)).toContain("Tailored Resume not found");
  });

  it("swaps both fields and the last autofilled values out of band, escaped", () => {
    const html = fragment();
    const area = tags(html, "textarea")[0];
    expect(area?.attrs).toMatchObject({
      id: "jobDescriptionShort",
      name: "jobDescriptionShort",
      "hx-swap-oob": "true",
    });
    expect(area?.html).toContain("- Postgres &lt;b&gt;");
    const inputs = voidTags(html, "input");
    expect(inputs.map((i) => [i.attrs.name, i.attrs.value, i.attrs["hx-swap-oob"]])).toEqual([
      ["company", "Acme", "true"],
      ["lastJobDescriptionShort", "- Postgres <b>", "true"],
      ["lastCompany", "Acme", "true"],
    ]);
  });

  it("makes the Resume select post an autofill on change without swapping itself", () => {
    const html = page();
    const select = tags(html, "select").find((s) => s.attrs.id === "tailoredResumeId");
    expect(select?.attrs).toMatchObject({
      "hx-post": "/admin/chats/autofill",
      "hx-trigger": "change",
      "hx-swap": "none",
    });
    expect(button(html, "Create")).toBeDefined();
    const hidden = voidTags(html, "input").filter((i) => i.attrs.type === "hidden");
    expect(hidden.map((i) => [i.attrs.name, i.attrs.value])).toEqual([
      ["lastJobDescriptionShort", ""],
      ["lastCompany", ""],
    ]);
  });
});
