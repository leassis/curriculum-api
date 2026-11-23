/**
 * Shows a failed generate in the status line instead of dropping the response, and lets the
 * career controls swap a rejected save back into `#career-library`.
 * Compiled by `pnpm build:js` into `src/admin/static/resumes-js.generated.ts`.
 */
import "../career/client";
import { swapErrorsInto } from "../static/htmx-client";

swapErrorsInto("editor-status");
