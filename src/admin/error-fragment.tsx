/** HTML fragment HTMX can swap in; never shows a stack trace. */
export const ErrorFragment = ({ message, toast }: { message: string; toast?: boolean }) => (
  <div class="error" role="alert" data-toast={toast ? "error" : undefined}>
    {message}
  </div>
);
