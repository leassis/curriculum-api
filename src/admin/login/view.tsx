import { ErrorFragment } from "../error-fragment.js";
import { Layout } from "../layout.js";

export const LoginPage = ({
  basePath,
  faviconUrl,
  error,
}: {
  basePath: string;
  faviconUrl?: string;
  error?: string;
}) => (
  <Layout title="Sign in" basePath={basePath} faviconUrl={faviconUrl} bare>
    <div class="card-pad mx-auto w-full max-w-sm">
      <h1 class="section-title">Sign in</h1>
      {error ? <ErrorFragment message={error} /> : null}
      <form class="form" method="post" action={`${basePath}/admin/login`}>
        <label class="field">
          <span class="field-label">Password</span>
          <input
            class="input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button type="submit" class="btn">
          Sign in
        </button>
      </form>
    </div>
  </Layout>
);
