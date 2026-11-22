import type { FC } from "hono/jsx";

/** HTML fragment HTMX can swap in; never shows a stack trace. */
export const ErrorFragment: FC<{ message: string }> = ({ message }) => (
  <div class="error" role="alert">
    {message}
  </div>
);
