# Career Library markdown format

The Career Library can be edited as markdown ("Edit markdown" on the Profile page) or converted from pasted text (import). Saving **replaces the whole library** with what the markdown contains: an item removed from the text is deleted.

Source of truth: `src/services/career/markdown.ts` (parse and render), `src/services/career/item.ts` (kinds, required fields), `src/services/career/display.ts` (dates, separators). Keep this file in sync with them.

This markdown covers Career Items only. The headline, summary, Additional information and Looking forward next are separate Profile fields and do not go here. Personal Info Fields (email, phone, city, links, full name) never go here: the PII Guard rejects them.

## Example

```markdown
## Experience

### Senior Backend Engineer
*Acme Corp · São Paulo · Jan 2021 – Present*
Maintained the billing platform.
- Cut report time from 40 to 8 minutes
- Led the migration to Postgres
Stack: TypeScript, Node, Postgres

## Education

### BSc Computer Science
*Example University · 2013 – 2017*

## Skills

### Backend
Go, Docker, SQL

## Languages

### English
*Fluent*
```

## Structure

```
## <Section>          one per kind, fixed names (below)
### <Item title>       one per item
*<meta line>*          optional, italic, first line after the title
<free text>            optional, any lines not starting with "- " or "Stack: "
- <bullet>             zero or more
Stack: a, b            optional, Experience and Projects only
```

Sections may appear in any order when parsing (rendering always uses the order below). Blank lines inside an item are allowed. Any non-blank line before the first `##` or between a `##` and the first `###` is an error.

## Sections

The `##` name must match exactly (case-insensitive). Any other name fails with `unknown section "..."`.

| Section          | Kind          | Required                      | Meta line                          | Body                     |
| ---------------- | ------------- | ----------------------------- | ---------------------------------- | ------------------------ |
| `Experience`     | experience    | title, organisation, start year | `*Organisation · Location · dates*` | text, bullets, `Stack:` |
| `Projects`       | project       | title, start year             | `*Organisation · dates*`           | text, bullets, `Stack:` |
| `Education`      | education     | title, organisation           | `*Organisation · dates*`           | text, bullets            |
| `Certifications` | certification | title, organisation           | `*Organisation · dates*`           | text, bullets            |
| `Courses`        | course        | title, organisation           | `*Organisation · dates*`           | text, bullets            |
| `Publications`   | publication   | title                         | `*Organisation · dates*`           | text, bullets            |
| `Honours`        | honour        | title                         | `*Organisation · dates*`           | text, bullets            |
| `Skills`         | skill_group   | title, skills                 | none                               | one comma-separated line |
| `Languages`      | language      | title, level                  | `*Level*`                          | none                     |

In the meta line, parts are separated by ` · ` (space, middle dot, space). Empty parts are left out. The meta line carries the organisation, location and dates, so it is needed whenever the item has any of them (and always for Experience, Education, Certifications and Courses, whose organisation is required).

## Dates

- `2021` or `Mar 2021`. Months: `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec`. Years 1950 to 2100.
- A range is `start – end` (en dash or hyphen, with spaces): `Jan 2021 – Mar 2023`.
- Ongoing end: `Present` for Experience and Projects, `No expiry` for Certifications. Other kinds have no ongoing end.
- Dates are the last part of the meta line. If the last part is not a valid date and the remaining parts exceed the slots (2 for Experience, 1 for the others), the error is `date not recognised: "..."`.

## Skills and Languages

- A **skill group** is a title plus one comma-separated line: `### Backend` then `Go, Docker`.
- A **language** is a title plus an italic level line: `### English` then `*Fluent*`.

## Free text that looks like a meta line

If the first free-text line is wrapped in `*...*`, the renderer prefixes it with a backslash (`\*text*`) and the parser strips it, so it is not mistaken for a meta line. Do not add the backslash by hand unless the text really starts and ends with `*`.

## Identity of items

On save, an item keeps its id when `kind + title + organisation` (case-insensitive) matches an existing item. Changing the title or organisation of an item creates a new item with a new id, which breaks the link from Tailored Resumes to their source item.

## Limits and errors

- At most 200 items.
- A parse error stops the save and reports `line N: reason` (for example `unknown section "Work"`, `item outside a section`, `text outside an item`, `date not recognised: "..."`, or a field validation message). Nothing is saved on error.

## Import from pasted text

"Import" sends pasted CV text to the model through `LlmService` and returns markdown in this format for review before saving. The text goes through the PII Guard first (Personal Info Field values and the full name are redacted). The prompt is `src/llm/import-prompt.ts`; it embeds an example rendered by the same code, so it stays aligned with the renderer.
