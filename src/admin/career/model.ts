import { groupByKind, MONTHS, metaLine } from "../../services/career/display.js";
import { type FormValues, formValues } from "../../services/career/form.js";
import { type CareerItem, fieldLabel, KIND_META, type Kind } from "../../services/career/item.js";
import type { CardView, FieldView, FormView } from "./view.js";

export function cardsFrom(items: CareerItem[]): CardView[] {
  return groupByKind(items).map(({ kind, section, items: group }) => ({
    kind,
    section,
    add: KIND_META[kind].add,
    rows: group.map((item) => ({ id: item.id, title: item.title, meta: metaLine(item) })),
  }));
}

function fieldsOf(kind: Kind): FieldView[] {
  const fields: FieldView[] = [];
  for (const field of KIND_META[kind].fields) {
    if (field === "current" || field === "bullets") continue;
    if (field === "text") fields.push({ name: "details", label: fieldLabel(kind, "text") });
    else if (field === "skills") {
      fields.push({
        name: kind === "skill_group" ? "skills" : "stack",
        label: fieldLabel(kind, "skills"),
      });
    } else fields.push({ name: field, label: fieldLabel(kind, field) });
  }
  return fields;
}

export function formFor(
  kind: Kind,
  options: { item?: CareerItem; values?: FormValues; error?: string } = {},
): FormView {
  return {
    kind,
    itemId: options.item?.id,
    fields: fieldsOf(kind),
    ongoing: KIND_META[kind].ongoing,
    months: MONTHS,
    values: options.values ?? (options.item ? formValues(options.item) : {}),
    error: options.error,
  };
}
