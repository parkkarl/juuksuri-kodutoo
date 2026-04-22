import type { FC } from "hono/jsx";
import { Layout } from "~/views/layout";

interface AdminLoginProps {
  csrfToken: string;
  error: string | null;
}

export const AdminLoginPage: FC<AdminLoginProps> = ({ csrfToken, error }) => (
  <Layout title="Admin sisselogimine">
    <section class="card narrow">
      <h1>Admin sisselogimine</h1>
      {error ? (
        <div class="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}
      <form method="post" action="/admin/login" class="stack">
        <input type="hidden" name="_csrf" value={csrfToken} />
        <label>
          Kasutajanimi:
          <input type="text" name="username" required autocomplete="username" />
        </label>
        <label>
          Parool:
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit">Logi sisse</button>
      </form>
    </section>
  </Layout>
);
