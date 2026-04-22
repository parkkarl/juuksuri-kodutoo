import type { FC } from "hono/jsx";
import { Layout } from "~/views/layout";

interface ErrorPageProps {
  status: number;
  message: string;
}

export const ErrorPage: FC<ErrorPageProps> = ({ status, message }) => (
  <Layout title={`Viga ${status}`}>
    <div class="card card-error">
      <h1>Viga {status}</h1>
      <p>{message}</p>
      <p>
        <a href="/" class="button">
          Tagasi avalehele
        </a>
      </p>
    </div>
  </Layout>
);
