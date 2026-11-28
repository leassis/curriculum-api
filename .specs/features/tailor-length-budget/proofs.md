# tailor-length-budget proofs

**HEAD**: 893273c
**Tree**: clean
**Shell**: /bin/sh
**Result**: 25 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ states the target pages and bullet caps in the tailor input` | pass |
| C2 | `run unit / ✓ weights experiences by recency` | pass |
| C3 | `run unit / ✓ never caps above the library bullet count` | pass |
| C4 | `run unit / ✓ keeps only the first cap bullets of an experience` | pass |
| C5 | `run unit / ✓ drops project bullets first, then experiences oldest to newest` | pass |
| C6 | `run unit / ✓ keeps every experience whatever the budget` | pass |
| C7 | `run unit / ✓ returns an over-minimum document with its estimate` | pass |
| C8 | `run unit / ✓ stores a long reply cut to the target pages` | pass |
| C9 | `run unit / ✓ creates a resume with the default target pages` | pass |
| C10 | `run unit / ✓ stores target pages from the options` | pass |
| C11 | `run unit / ✓ rejects target pages outside 1 to 3` | pass |
| C12 | `run int / ✓ rejects a target pages override outside 1 to 3` | pass |
| C13 | `run int / ✓ gives existing resumes target pages 2` | pass |
| C14 | `run unit / ✓ shows the page estimate against the target` | pass |
| C15 | `run unit / ✓ warns only when the estimate exceeds the target` | pass |
| C16 | `run unit / ✓ shows no estimate before the first generation` | pass |
| C17 | `run unit / ✓ uses 120 characters when the library has no bullets` | pass |
| C18 | `run unit / ✓ scales the estimate for Letter` | pass |
| C19 | `run unit / ✓ keeps every bullet under the cap` | pass |
| C20 | `run unit / ✓ saves the target pages default in Settings` | pass |
| C21 | `run unit / ✓ tailor prompt asks to keep within the length budget` | pass |
| C22 | `run unit / ✓ ranks a role with no end date as ongoing` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes career routes > header save answers 400 with the form open and the entered values 3ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes career routes > header save rejects the full name and personal info 4ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes career routes > header and item routes answer 400 before the resume is generated 1ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes career routes > every control swaps the whole career fragment 2ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > creates a resume with the posted tracking fields 3ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > saves posted tracking fields and keeps omitted ones 1ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > answers 400 for an invalid job link on create and save 1ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > shows job link, recruiter name and notes on the new resume form 1ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > shows the stored tracking fields in the editor form 1ms
 ✓ |unit| test/unit/admin/resumes.test.tsx > admin resumes tracking fields > links the job link in a new tab with noopener noreferrer 1ms

 Test Files  8 passed (8)
      Tests  185 passed (185)
   Start at  19:52:33
   Duration  1.10s (import 67%, tests 20%, transform 11%, worker 1%)
```

`Run int` - exit 0

```
RUN  v5.1.1 /Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/bold-jackson-319c04

 ✓ |integration| test/integration/db/target-pages-migration.test.ts > target pages column > gives existing resumes target pages 2 42ms
 ✓ |integration| test/integration/db/target-pages-migration.test.ts > target pages column > rejects target pages outside 1 to 3 17ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 51ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > rejects a target pages override outside 1 to 3 13ms

 Test Files  2 passed (2)
      Tests  4 passed (4)
   Start at  19:52:35
   Duration  2.95s (import 78%, tests 20%, transform 2%, worker 1%)
```
