import type { FC } from "hono/jsx";
import type { BookingWithBarber } from "~/models/booking.model";
import { formatDateTime, todayIso } from "~/utils/time";
import { Layout } from "~/views/layout";

interface AdminBookingsPageProps {
  bookings: BookingWithBarber[];
  selectedDate: string | null;
  userId: number;
}

export const AdminBookingsPage: FC<AdminBookingsPageProps> = ({
  bookings,
  selectedDate,
  userId,
}) => (
  <Layout title="Broneeringute haldus" userId={userId}>
    <h1>Broneeringud</h1>

    <form method="get" action="/admin/bookings" class="filter-bar">
      <label>
        Kuupäev:
        <input
          type="date"
          name="date"
          value={selectedDate ?? ""}
          max={todayIso().replace(/\d{4}/, (y) => String(Number(y) + 10))}
        />
      </label>
      <button type="submit">Filtreeri</button>
      <a href="/admin/bookings" class="button-secondary">
        Näita kõiki
      </a>
    </form>

    {bookings.length === 0 ? (
      <p>Broneeringuid ei leitud.</p>
    ) : (
      <table class="data-table">
        <thead>
          <tr>
            <th>Aeg</th>
            <th>Juuksur</th>
            <th>Klient</th>
            <th>Telefon</th>
            <th>E-post</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{formatDateTime(b.start_time)}</td>
              <td>{b.barber_name}</td>
              <td>{b.customer_name}</td>
              <td>{b.customer_phone}</td>
              <td>{b.customer_email ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </Layout>
);
