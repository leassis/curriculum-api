# tailor-empty-text proofs

**HEAD**: 80f6af6
**Tree**: clean
**Shell**: /bin/sh
**Result**: 7 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ keeps an empty library text empty whatever the model returns` | pass |
| C2 | `run unit / ✓ treats a whitespace-only library text as empty` | pass |
| C3 | `run unit / ✓ copies typed fields from the library and bodies from the model` | pass |
| C4 | `run unit / ✓ tailor prompt forbids restating the meta line in item text` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > takes headline and summary from the model with markers stripped 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > restores omitted experience, education, certifications, courses, skills and languages after the model items 1ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > keeps the model order inside a kind and orders kinds as the library does 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > rejects an unknown id 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > rejects a duplicate id 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > rejects a document the schema refuses 1ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > keeps an empty library text empty whatever the model returns 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > treats a whitespace-only library text as empty 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > keeps a skill group's library body whatever the model returns 0ms
 ✓ |unit| test/unit/services/tailor/assemble.test.ts > assemble v2 > reports the items it restored in library order 0ms

 Test Files  2 passed (2)
      Tests  18 passed (18)
   Start at  18:46:43
   Duration  145ms (import 61%, transform 17%, tests 15%, worker 6%)
```
