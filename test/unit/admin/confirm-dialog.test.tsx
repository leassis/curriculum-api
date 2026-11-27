import { describe, expect, it } from "vitest";
import { ConfirmDialog, Layout } from "../../../src/admin/layout";
import { tags } from "../../support/html";

describe("confirm dialog", () => {
  it("renders a closed dialog with Cancel and Confirm buttons that close it", () => {
    const html = String(<ConfirmDialog />);
    const [dialog] = tags(html, "dialog");
    expect(dialog?.attrs).toMatchObject({
      id: "confirm-dialog",
      "aria-labelledby": "confirm-message",
    });
    expect(dialog?.attrs.open).toBeUndefined();
    expect(tags(html, "form")[0]?.attrs.method).toBe("dialog");
    expect(html).toContain('id="confirm-message"');
    const buttons = tags(html, "button").map((b) => [b.attrs.value, b.attrs.class]);
    expect(buttons).toEqual([
      ["cancel", "btn-ghost"],
      ["ok", "btn confirm-ok"],
    ]);
  });

  it("is rendered once on every admin page, bare pages included", () => {
    for (const bare of [false, true]) {
      const html = String(
        <Layout title="Profile" basePath="/x" bare={bare}>
          <p>content</p>
        </Layout>,
      );
      expect(html.match(/id="confirm-dialog"/g)).toHaveLength(1);
    }
  });
});
