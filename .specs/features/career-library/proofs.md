# career-library proofs

**HEAD**: d1b332a
**Tree**: clean
**Shell**: /bin/sh
**Result**: 73 pass, 3 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ career cards > renders the cards in kind order` | pass |
| C2 | `browser captures/education-certifications-courses.running.png` | pass |
| C3 | `browser captures/skills-publications-honours.running.png` | **diverges** (screens.md) |
| C4 | `run unit / ✓ career cards > shows the item count next to a card with items` | pass |
| C5 | `run unit / ✓ career cards > shows nothing here yet and no badge for an empty kind` | pass |
| C6 | `run unit / ✓ display > builds experience and project meta lines without empty parts` | pass |
| C7 | `run unit / ✓ display > builds education certification and course meta lines` | pass |
| C8 | `run unit / ✓ display > builds skill group language publication and honour meta lines` | pass |
| C9 | `run unit / ✓ display > formats dates and ranges` | pass |
| C10 | `run unit / ✓ display > ends current experience with present and current certification with no expiry` | pass |
| C11 | `run unit / ✓ admin profile career > add opens an empty form at the end of the card` | pass |
| C12 | `browser captures/project-form.running.png` | **diverges** (screens.md) |
| C13 | `run unit / ✓ career cards item form > shows the kind fields and its ongoing label` | pass |
| C14 | `run unit / ✓ career form > splits details into text and bullets and joins them back` | pass |
| C15 | `run unit / ✓ career form > splits the tech stack on commas and joins it back` | pass |
| C16 | `run int / ✓ admin profile career routes > saves a new item and re-renders its card` | pass |
| C17 | `run unit / ✓ admin profile career > edit replaces the row with a filled form` | pass |
| C18 | `run unit / ✓ admin profile career > cancel shows the row unchanged` | pass |
| C19 | `run unit / ✓ career ops > moves an item past its neighbour of the same kind` | pass |
| C20 | `run int / ✓ admin profile career routes > stores a move and re-renders the card` | pass |
| C21 | `run unit / ✓ career cards > disables move up on the first row and move down on the last` | pass |
| C22 | `run unit / ✓ admin profile career > delete asks delete this item and removes the item` | pass |
| C23 | `run unit / ✓ admin profile career > answers field is required and keeps the entered values` | pass |
| C24 | `run unit / ✓ career item schema > requires the fields of each kind` | pass |
| C25 | `run unit / ✓ career service > rejects an end date before the start date` | pass |
| C26 | `run unit / ✓ career service > rejects personal info and the full name in item fields` | pass |
| C27 | `run int / ✓ admin profile routes > stores headline and summary` | pass |
| C28 | `run unit / ✓ career item schema > rejects years and months out of range` | pass |
| C29 | `run unit / ✓ career item schema > rejects a month without its year` | pass |
| C30 | `run unit / ✓ career item schema > clears the end date of a current item` | pass |
| C31 | `run unit / ✓ career service > rejects an item beyond 200` | pass |
| C32 | `run unit / ✓ career item schema > rejects every field over its bound` | pass |
| C33 | `run unit / ✓ career ops > keeps the only item of a kind in place` | pass |
| C34 | `run int / ✓ career repository > applies concurrent updates in sequence` | pass |
| C35 | `run unit / ✓ admin profile career > edit as markdown shows the rendered library` | pass |
| C36 | `run unit / ✓ library markdown > renders the sample library in the convention` | pass |
| C37 | `run unit / ✓ career service > save markdown replaces the library in markdown order without the llm` | pass |
| C38 | `run unit / ✓ library markdown > round trips generated libraries` | pass |
| C39 | `run unit / ✓ library markdown > reuses ids by kind title and organisation` | pass |
| C40 | `run unit / ✓ library markdown > reports the line of a convention error` | pass |
| C41 | `run unit / ✓ library markdown > reports a field rule at the item line` | pass |
| C42 | `run unit / ✓ admin profile career > keeps the markdown text after a 400` | pass |
| C43 | `run unit / ✓ admin profile career > markdown cancel shows the cards unchanged` | pass |
| C44 | `run unit / ✓ admin profile career > import shows a textarea with convert and cancel` | pass |
| C45 | `run unit / ✓ career service import > redacts personal info and the full name before the call` | pass |
| C46 | `run unit / ✓ career service import > sends the data block to the import model and returns its markdown` | pass |
| C47 | `run unit / ✓ career service import > stores nothing` | pass |
| C48 | `run unit / ✓ career service import > rejects empty text` | pass |
| C49 | `run unit / ✓ career service import > rejects text over 50000 characters` | pass |
| C50 | `run unit / ✓ admin profile career > import outage answers 503 and keeps the text` | pass |
| C51 | `run unit / ✓ admin settings > import model is shown and used by the next convert` | pass |
| C52 | `run unit / ✓ settings service > resolves the import model from override then config` | pass |
| C53 | `run unit / ✓ import prompt > example parses with the library parser` | pass |
| C54 | `run unit / ✓ career body > renders headline summary and items in section order` | pass |
| C55 | `run unit / ✓ public chat service > sends the career body rendered from the library` | pass |
| C56 | `run unit / ✓ public chat service > sends the empty cv body when the library is empty` | pass |
| C57 | `run unit / ✓ career service > keeps personal info and the full name out of the career body` | pass |
| C58 | `run unit / ✓ resume document v2 > accepts the v2 shape and rejects v1` | pass |
| C59 | `run unit / ✓ resume service v2 generate > sends annotated items and no personal header` | pass |
| C60 | `run unit / ✓ assemble v2 > copies typed fields from the library and bodies from the model` | pass |
| C61 | `run unit / ✓ assemble v2 > sets source id to the library item id` | pass |
| C62 | `run unit / ✓ assemble v2 > restores omitted experience and education after the model items` | pass |
| C63 | `run unit / ✓ admin resumes > generate answers 503 after one retry when the model names an unknown id twice` | pass |
| C64 | `run unit / ✓ resume service v2 generate > rejects an empty library before calling the llm` | pass |
| C65 | `browser captures/header-experience.running.png` | **diverges** (screens.md) |
| C66 | `run int / ✓ admin resumes career routes > edits the resume copy and leaves the library unchanged` | pass |
| C67 | `run unit / ✓ resume service items > adds an item with a null source id` | pass |
| C68 | `run unit / ✓ resume service items > keeps a tailored item whose library item was deleted` | pass |
| C69 | `run unit / ✓ resume service v2 print > renders print and download with the career body` | pass |
| C70 | `run unit / ✓ recruiter chat service > sends the resume career body or the library body` | pass |
| C71 | `run unit / ✓ resume service v2 get > treats an invalid document as not generated and logs it` | pass |
| C72 | `run int / ✓ career migration > creates the singleton library and the profile summary` | pass |
| C73 | `run int / ✓ career migration > drops the master cv and discards v1 documents keeping rows` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:121:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:55:45)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-api/src/services/public-chat.service.ts:35:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`Run int` - exit 0

```
To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:15440) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
```
