/** HTML fragment HTMX can swap in; never shows a stack trace. */
export const ErrorFragment = ({ message }: { message: string }) => (
  <div class="error" role="alert">
    {message}
  </div>
);
