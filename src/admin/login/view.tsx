import { ErrorFragment } from "../error-fragment.js";
import { Layout } from "../layout.js";

export const LoginPage = ({ basePath, error }: { basePath: string; error?: string }) => (
  <Layout title="Sign in" basePath={basePath}>
    <h1>Sign in</h1>
    {error ? <ErrorFragment message={error} /> : null}
    <form method="post" action={`${basePath}/admin/login`}>
      <label>
        Password <input type="password" name="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </Layout>
);
