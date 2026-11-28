# Tailor Empty Text verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 80f6af6
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `assemble.test.ts` `keeps an empty library text empty whatever the model returns` | yes - fails when the fix is reverted (mutation: `return cleanText(returned)`); asserts `text: ""` and bullets kept |
| C2 | `assemble.test.ts` `treats a whitespace-only library text as empty` | yes - fails when the trim is dropped (mutation: `item.text === ""`) and when the fix is reverted |
| C3 | `assemble.test.ts` `copies typed fields from the library and bodies from the model` | yes - fails when the assembly always returns "" (mutation); asserts the model's text on a non-empty library text. Does not exercise cleaning on that path (no marker or whitespace in the reply text) |
| C4 | `default-prompts.test.ts` `tailor prompt forbids restating the meta line in item text` | yes - fails when the rule line is deleted (mutation); asserts the exact criterion sentence |

## Findings

None - mutated `textOf` three ways and deleted the prompt rule, each turned the matching test red and was restored; a throwaway test with a project (empty text), an education (tab-only text), an education (non-empty text) and a skill group (no text field) with a model reply of restated text gave "", "", the cleaned model text and "" as the spec says.
