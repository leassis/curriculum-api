/**
 * Shows a failed save or generate in the status line instead of dropping the response.
 * Compiled by `pnpm build:js` into `src/admin/static/resumes-js.generated.ts`.
 */
import { swapErrorsInto } from "../static/htmx-client";

swapErrorsInto("editor-status");
