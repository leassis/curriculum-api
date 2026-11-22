# Print PDF Tasks

**Design**: inline (no `design.md`): the print stylesheet moves from `print.tsx` to `src/admin/print-style.ts` (`printCss(pageSize)`), `print.tsx` keeps routes and markup. Conforms to AD-002/AD-003.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Existing tests in `test/unit/admin/print.test.tsx` stay unchanged. No integration test is needed: print pages are covered end to end with the real DB by `test/integration/routes/resumes.test.ts`, run in the full gate.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/admin/print-style.ts`, `src/admin/print.tsx` | unit via `createTestApp` with fakes | `test/unit/admin/print*.test.tsx` | `pnpm test:unit` |

## Gate Check Commands

Full: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Execution Plan

```
T1 -> T2 -> T3
```

Sequential: all three tasks edit the same stylesheet and page.

## Task Breakdown

### T1: Reference typography

**What**: Move the stylesheet to `printCss(pageSize)` in `src/admin/print-style.ts` and port the typography of `curriculum-ai/styles/print.css` (Arial 10pt, name, contact, h2, h3, date line, lists, justified text).
**Where**: `src/admin/print-style.ts`, `src/admin/print.tsx`, `test/unit/admin/print-style.test.tsx`
**Depends on**: None
**Reuses**: `printRouter`, `resumeApp` test support
**Requirement**: PDF-01..PDF-04

**Done when**:
- [x] Tests for PDF-01..PDF-04 pass and the old print tests pass unchanged
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(print): port reference typography to the print stylesheet`
**Status**: done

---

### T2: Page-break rules

**What**: Add `break-after`, `break-before`, `break-inside`, `orphans`, `widows` and `print-color-adjust` rules.
**Where**: `src/admin/print-style.ts`, `test/unit/admin/print-style.test.tsx`
**Depends on**: T1
**Reuses**: `printCss`
**Requirement**: PDF-05..PDF-07

**Done when**:
- [x] Tests for PDF-05..PDF-07 pass
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(print): keep entries together across page breaks`
**Status**: done

---

### T3: On-screen toolbar

**What**: Screen-only link back to the editor (or the profile) and a tip about browser headers and footers.
**Where**: `src/admin/print.tsx`, `test/unit/admin/print-style.test.tsx`
**Depends on**: T2
**Reuses**: `PrintPage`, `.screen-only`
**Requirement**: PDF-08..PDF-10

**Done when**:
- [x] Tests for PDF-08..PDF-10 pass
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(print): add back link and header tip to the print view`
**Status**: done

---

## Checks

**C1** - Body is Arial 10pt, line height 1.35, black (PDF-01)
Proof: run unit | ✓ admin print style > sets Arial 10pt with line height 1.35 in black

**C2** - Name 22pt bold centred `#2c3e50`; contact centred `#555555` (PDF-02)
Proof: run unit | ✓ admin print style > centres the name at 22pt and the contact list in grey

**C3** - h2 uppercase 12pt, h3 12pt, date line italic grey (PDF-03)
Proof: run unit | ✓ admin print style > styles h2 as uppercase, h3 and the line under it

**C4** - `@page` stays as specified for A4 and Letter on both print pages (PDF-04)
Proof: run unit | ✓ admin print style > keeps the page rule for A4 and Letter on both print pages

**C5** - Headings avoid a break after them (PDF-05)
Proof: run unit | ✓ admin print style > keeps headings with the content after them

**C6** - Blocks avoid inner breaks; paragraphs carry orphans and widows 3 (PDF-06)
Proof: run unit | ✓ admin print style > never splits a block and keeps three lines at page edges

**C7** - Colours print exactly (PDF-07)
Proof: run unit | ✓ admin print style > asks the browser to print colours exactly

**C8** - Back link targets for resume and Master CV (PDF-08)
Proof: run unit | ✓ admin print toolbar > links back to the resume editor and to the profile page

**C9** - Headers and footers tip on screen (PDF-09)
Proof: run unit | ✓ admin print toolbar > tells the owner to turn off headers and footers

**C10** - Link and tip are screen-only, the button stays wired (PDF-10)
Proof: run unit | ✓ admin print toolbar > hides the link and the tip in print

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** none - no screen; no captures cited.
