const ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
};

export function decode(text: string): string {
  return text.replace(/&(?:quot|#39|lt|gt|amp);/g, (m) => ENTITIES[m] ?? m);
}

export interface Tag {
  attrs: Record<string, string>;
  html: string;
  text: string;
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
    attrs[m[1] as string] = decode(m[2] ?? "");
  }
  return attrs;
}

export function tags(html: string, name: string): Tag[] {
  const re = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`, "g");
  return [...html.matchAll(re)].map((m) => ({
    attrs: parseAttrs(m[1] as string),
    html: m[0],
    text: decode((m[2] as string).replace(/<[^>]*>/g, "").trim()),
  }));
}

export function voidTags(html: string, name: string): Tag[] {
  const re = new RegExp(`<${name}\\b([^>]*?)/?>`, "g");
  return [...html.matchAll(re)].map((m) => ({
    attrs: parseAttrs(m[1] as string),
    html: m[0],
    text: "",
  }));
}

export function sections(html: string): { title: string; html: string }[] {
  return tags(html, "section").map((s) => ({
    title: tags(s.html, "h2")[0]?.text ?? "",
    html: s.html,
  }));
}

export function button(html: string, label: string | RegExp): Tag {
  const found = tags(html, "button").find((b) => {
    const text = b.attrs["aria-label"] ?? b.text;
    return typeof label === "string" ? text === label : label.test(text);
  });
  if (!found) throw new Error(`no button ${String(label)}`);
  return found;
}

export interface Gesture {
  method: string;
  path: string;
  fields: Record<string, string>;
}

/** The request an HTMX control sends when clicked (hx-get/post/put/delete plus hx-vals). */
export function gesture(control: Tag): Gesture {
  for (const method of ["get", "post", "put", "delete"] as const) {
    const path = control.attrs[`hx-${method}`];
    if (path !== undefined) {
      const fields = control.attrs["hx-vals"] ? JSON.parse(control.attrs["hx-vals"]) : {};
      return { method: method.toUpperCase(), path, fields };
    }
  }
  throw new Error("control has no hx request");
}

/** The fields a browser would submit for `form`: inputs, checked boxes, textareas, selected options. */
export function formFields(form: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const input of voidTags(form, "input")) {
    const { name, type, value } = input.attrs;
    if (!name) continue;
    if (type === "checkbox") {
      if ("checked" in input.attrs) fields[name] = value ?? "on";
    } else fields[name] = value ?? "";
  }
  for (const area of tags(form, "textarea")) {
    if (area.attrs.name)
      fields[area.attrs.name] = decode(area.html.replace(/^<[^>]*>|<\/textarea>$/g, ""));
  }
  for (const select of tags(form, "select")) {
    if (!select.attrs.name) continue;
    const chosen = tags(select.html, "option").find((o) => "selected" in o.attrs);
    fields[select.attrs.name] = chosen?.attrs.value ?? "";
  }
  return fields;
}
