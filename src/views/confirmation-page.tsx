import type { FC } from "hono/jsx";
import { formatDateTime } from "~/utils/time";
import { Layout } from "~/views/layout";

interface ConfirmationPageProps {
  barberName: string;
  startTime: Date;
  customerName: string;
}

export const ConfirmationPage: FC<ConfirmationPageProps> = ({
  barberName,
  startTime,
  customerName,
}) => (
  <Layout title="Broneering kinnitatud">
    <div class="card card-success">
      <h1>Broneering on kinnitatud!</h1>
      <p>
        Aitäh, <strong>{customerName}</strong>!
      </p>
      <dl class="summary">
        <dt>Juuksur:</dt>
        <dd>{barberName}</dd>
        <dt>Aeg:</dt>
        <dd>{formatDateTime(startTime)}</dd>
      </dl>
      <p>
        <a href="/" class="button">
          Tagasi avalehele
        </a>
      </p>
    </div>
  </Layout>
);
