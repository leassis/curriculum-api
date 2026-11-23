import { describe, expect, it } from "vitest";
import { cardsFrom, formFor } from "../../../src/admin/career/model";
import { CareerCards, ItemForm } from "../../../src/admin/career/view";
import type { KINDS } from "../../../src/services/career/item";
import { item, sampleLibrary } from "../../support/career";
import { button, gesture, sections, tags, voidTags } from "../../support/html";

const URL = "/admin/profile/items";

const render = (items = sampleLibrary().items, form?: ReturnType<typeof formFor>) =>
  (<CareerCards cards={cardsFrom(items)} url={URL} form={form} />).toString();

describe("career cards", () => {
  it("renders the cards in kind order", () => {
    expect(sections(render()).map((s) => s.title)).toEqual([
      "Experience2",
      "Projects1",
      "Education2",
      "Certifications1",
      "Courses1",
      "Skills2",
      "Languages1",
      "Publications",
      "Honours",
    ]);
  });

  it("shows the item count next to a card with items", () => {
    const html = render();
    const badge = (title: string) =>
      tags(sections(html).find((s) => s.title.startsWith(title))?.html ?? "", "span").find((s) =>
        s.attrs.class?.includes("badge"),
      )?.text;
    expect(badge("Experience")).toBe("2");
    expect(badge("Education")).toBe("2");
    expect(badge("Skills")).toBe("2");
    expect(badge("Projects")).toBe("1");
  });

  it("shows nothing here yet and no badge for an empty kind", () => {
    const html = render();
    for (const title of ["Publications", "Honours"]) {
      const card = sections(html).find((s) => s.title === title)?.html ?? "";
      expect(card).toContain("Nothing here yet.");
      expect(card).not.toContain('class="badge"');
    }
    expect(sections(html).find((s) => s.title.startsWith("Experience"))?.html).not.toContain(
      "Nothing here yet.",
    );
  });

  it("shows each row title over its meta line and one add button per kind", () => {
    const html = render();
    expect(html).toContain("Staff Engineer");
    expect(html).toContain("Globex · Remote · Jan 2020 – Present");
    expect(html).toContain("AWS Solutions Architect");
    expect(html).toContain("Amazon · Jun 2021 – No expiry");
    for (const add of [
      "Add experience",
      "Add project",
      "Add education",
      "Add certification",
      "Add course",
      "Add skill group",
      "Add language",
      "Add publication",
      "Add honour",
    ]) {
      expect(tags(html, "button").some((b) => b.text.endsWith(add))).toBe(true);
    }
  });

  it("disables move up on the first row and move down on the last", () => {
    const html = render();
    const experience = sections(html)[0]?.html ?? "";
    expect(button(experience, "Move Staff Engineer up").attrs).toHaveProperty("disabled");
    expect(button(experience, "Move Staff Engineer down").attrs).not.toHaveProperty("disabled");
    expect(button(experience, "Move Engineer up").attrs).not.toHaveProperty("disabled");
    expect(button(experience, "Move Engineer down").attrs).toHaveProperty("disabled");
    const language = sections(html).find((s) => s.title.startsWith("Languages"))?.html ?? "";
    expect(button(language, "Move English up").attrs).toHaveProperty("disabled");
    expect(button(language, "Move English down").attrs).toHaveProperty("disabled");
  });

  it("asks delete this item on the trash button and sends the delete", () => {
    const { id } = item("language", { title: "French", level: "B2" });
    const html = render([item("language", { id, title: "French", level: "B2" })]);
    const trash = button(html, "Delete French");
    expect(trash.attrs["hx-confirm"]).toBe("Delete this item?");
    expect(gesture(trash)).toEqual({ method: "DELETE", path: `${URL}/${id}`, fields: {} });
  });

  it("sends move and add requests from the row and card buttons", () => {
    const [first] = sampleLibrary().items;
    const html = render();
    expect(gesture(button(html, `Move ${first?.title} down`))).toEqual({
      method: "POST",
      path: `${URL}/${first?.id}/move`,
      fields: { direction: "down" },
    });
    expect(gesture(button(html, /Add project$/))).toEqual({
      method: "GET",
      path: `${URL}/new?kind=project`,
      fields: {},
    });
  });

  it("opens an empty form at the end of its card when adding", () => {
    const html = render(sampleLibrary().items, formFor("project"));
    const card = sections(html).find((s) => s.title.startsWith("Projects"))?.html ?? "";
    expect(card.indexOf("Open source CLI")).toBeLessThan(card.indexOf("<form"));
    expect(card).toContain('<input type="hidden" name="kind" value="project"');
    expect(html.match(/<form/g)).toHaveLength(1);
    const form = tags(card, "form")[0];
    expect(gesture(form as never)).toEqual({ method: "POST", path: URL, fields: {} });
  });

  it("replaces the edited row with a form holding its values, Save and Cancel", () => {
    const items = sampleLibrary().items;
    const edited = items[0];
    const html = render(items, formFor("experience", { item: edited }));
    const card = sections(html)[0]?.html ?? "";
    expect(card).not.toContain("Move Staff Engineer up");
    expect(card).toContain("Move Engineer up");
    const form = tags(card, "form")[0] as never as ReturnType<typeof tags>[number];
    expect(gesture(form)).toEqual({ method: "PUT", path: `${URL}/${edited?.id}`, fields: {} });
    const value = (name: string) =>
      voidTags(card, "input").find((i) => i.attrs.name === name)?.attrs.value;
    expect(value("title")).toBe("Staff Engineer");
    expect(value("organisation")).toBe("Globex");
    expect(value("location")).toBe("Remote");
    expect(value("startYear")).toBe("2020");
    expect(value("stack")).toBe("TypeScript, Postgres");
    expect(card).toContain(
      "Led the platform team and its on-call rotation.\n- Cut p99 latency by 40%",
    );
    expect(button(card, "Save").attrs.type).toBe("submit");
    expect(gesture(button(card, "Cancel"))).toEqual({ method: "GET", path: URL, fields: {} });
  });

  it("shows the error line and the entered values in the open form", () => {
    const form = formFor("project", {
      values: { title: "Kept title", startYear: "" },
      error: "Start year is required",
    });
    const html = render(sampleLibrary().items, form);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Start year is required");
    expect(html).toContain('value="Kept title"');
  });
});

describe("career cards item form", () => {
  const html = (kind: (typeof KINDS)[number]) =>
    (<ItemForm form={formFor(kind)} url={URL} />).toString();
  const labels = (markup: string) => tags(markup, "label").map((l) => l.text);

  it("shows the kind fields and its ongoing label", () => {
    expect(labels(html("project"))).toEqual([
      "Project",
      "Client or organisation",
      "Start year",
      "Start month",
      "End year",
      "End month",
      "Ongoing",
      "Details",
      "Tech stack",
    ]);
    expect(labels(html("experience"))).toEqual([
      "Position",
      "Company",
      "Location",
      "Start year",
      "Start month",
      "End year",
      "End month",
      "I currently work here",
      "Details",
      "Tech stack",
    ]);
    expect(labels(html("certification"))).toEqual([
      "Certification",
      "Issuer",
      "Start year",
      "Start month",
      "End year",
      "End month",
      "No expiry",
      "Details",
    ]);
    for (const kind of ["education", "course"] as const) {
      expect(labels(html(kind))).not.toContain("Ongoing");
      expect(labels(html(kind))).toContain("Details");
    }
    expect(labels(html("skill_group"))).toEqual(["Skill group", "Skills"]);
    expect(labels(html("language"))).toEqual(["Language", "Level"]);
    expect(labels(html("publication"))).toContain("Publisher");
    expect(labels(html("honour"))).toContain("Awarded by");
  });

  it("offers a Month placeholder and twelve months in each month select", () => {
    const selects = tags(html("project"), "select");
    expect(selects.map((s) => s.attrs.name)).toEqual(["startMonth", "endMonth"]);
    for (const select of selects) {
      const options = tags(select.html, "option");
      expect(options).toHaveLength(13);
      expect(options[0]?.text).toBe("Month");
      expect(options[0]?.attrs.value).toBe("");
      expect(options[3]?.text).toBe("Mar");
    }
  });

  it("selects the stored month and checks the ongoing box of a current item", () => {
    const current = item("experience", { startYear: 2020, startMonth: 3, current: true });
    const markup = (
      <ItemForm form={formFor("experience", { item: current })} url={URL} />
    ).toString();
    const start = tags(markup, "select")[0];
    expect(tags(start?.html ?? "", "option").find((o) => "selected" in o.attrs)?.attrs.value).toBe(
      "3",
    );
    const box = voidTags(markup, "input").find((i) => i.attrs.name === "current");
    expect(box?.attrs).toHaveProperty("checked");
  });

  it("offers Cancel and Save", () => {
    const markup = html("project");
    expect(button(markup, "Cancel").attrs.type).toBe("button");
    expect(button(markup, "Save").attrs.type).toBe("submit");
  });
});
