import { describe, expect, it } from "vitest";
import { ResumesPage, type ResumeView } from "../../../src/admin/resumes/view";
import { button, tags } from "../../support/html";

const resume = (overrides: Partial<ResumeView> = {}): ResumeView => ({
  id: "00000000-0000-4000-8000-000000000001",
  title: "Backend at Acme",
  company: "Acme",
  model: null,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  jobDescription: "Build things",
  customInstructions: "",
  jobLink: "",
  recruiterName: "",
  notes: "",
  headerFields: null,
  document: null,
  invalid: false,
  score: 85,
  ...overrides,
});

const render = (resumes: ResumeView[]) =>
  String(<ResumesPage basePath="" resumes={resumes} options={[]} />);
const rows = (html: string) => tags(tags(html, "tbody")[0]?.html ?? "", "tr");

describe("resumes list", () => {
  it("renders a score bar filled to the score with the percentage", () => {
    const [row] = rows(render([resume({ score: 85 })]));
    expect(row?.html).toContain('class="score-fill" style="width: 85%"');
    expect(row?.html).toContain("85%");
  });

  it("shows a muted dash and no bar when the score is null", () => {
    const [row] = rows(render([resume({ score: null })]));
    expect(row?.html).not.toContain("score-fill");
    expect(row?.html).toContain("—");
    expect(row?.html).toContain("Not assessed");
  });

  it("deletes with a labelled trash icon button and confirms", () => {
    const html = render([resume()]);
    const trash = button(html, "Delete Backend at Acme");
    expect(trash.attrs["hx-delete"]).toBe("/admin/resumes/00000000-0000-4000-8000-000000000001");
    expect(trash.attrs["hx-confirm"]).toBe("Delete Backend at Acme?");
    expect(trash.html).toContain("<svg");
  });

  it("has no regenerate action in the rows", () => {
    const [row] = rows(render([resume()]));
    expect(row?.html).not.toMatch(/generate/i);
  });

  it("shows a Recruiter column after Company", () => {
    const html = render([
      resume({ title: "Backend at Acme", recruiterName: "Grace Hopper" }),
      resume({ id: "00000000-0000-4000-8000-000000000002", title: "Data at Globex" }),
    ]);
    const headers = tags(tags(html, "thead")[0]?.html ?? "", "th").map((th) => th.text);
    expect(headers.slice(0, 4)).toEqual(["Title", "Company", "Recruiter", "Updated"]);
    const cells = rows(html).map((r) => tags(r.html, "td").map((td) => td.text));
    expect(cells[0]?.slice(0, 3)).toEqual(["Backend at Acme", "Acme", "Grace Hopper"]);
    expect(cells[1]?.slice(0, 3)).toEqual(["Data at Globex", "Acme", ""]);
  });
});
