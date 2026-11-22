# Print PDF verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 529e29b
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `print-style.test.tsx` `sets Arial 10pt with line height 1.35 in black` | yes |
| C2 | `print-style.test.tsx` `centres the name at 22pt and the contact list in grey` | yes |
| C3 | `print-style.test.tsx` `styles h2 as uppercase, h3 and the line under it` | yes |
| C4 | `print-style.test.tsx` `keeps the page rule for A4 and Letter on both print pages` | yes |
| C5 | `print-style.test.tsx` `keeps headings with the content after them` | yes |
| C6 | `print-style.test.tsx` `never splits a block and keeps three lines at page edges` | yes |
| C7 | `print-style.test.tsx` `asks the browser to print colours exactly` | yes |
| C8 | `print-style.test.tsx` `links back to the resume editor and to the profile page` | yes |
| C9 | `print-style.test.tsx` `tells the owner to turn off headers and footers` | yes |
| C10 | `print-style.test.tsx` `hides the link and the tip in print` | yes |

## Findings

None - CSS compared rule by rule with curriculum-ai `styles/print.css` (values match; `@page` margin, body max-width and `h1 + p` differences are declared in the spec); no inline script, `print.js` still served from self; no dependency or lockfile change; PII print rules untouched; `test/support/config.ts` change is a minimal `TEST_DATABASE_URL ?? default`.
