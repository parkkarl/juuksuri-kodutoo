// Avalik broneerimisvaade.
import type { FC } from "hono/jsx";
import type { Barber } from "~/models/barber.model";
import { formatTime, todayIso } from "~/utils/time";
import { Layout } from "~/views/layout";

interface BookingPageProps {
  barbers: Barber[];
  csrfToken: string;
  selectedBarberId: number | null;
  selectedDate: string;
  availableSlots: Date[];
  message: { type: "error" | "success"; text: string } | null;
  prefill?: {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    startTime?: string;
  };
}

export const BookingPage: FC<BookingPageProps> = ({
  barbers,
  csrfToken,
  selectedBarberId,
  selectedDate,
  availableSlots,
  message,
  prefill,
}) => (
  <Layout title="Broneeri aeg">
    <h1>Broneeri juuksuri juurde aeg</h1>

    {message ? (
      <div class={`alert alert-${message.type}`} role="alert">
        {message.text}
      </div>
    ) : null}

    <section class="card">
      <h2>1. Vali juuksur ja kuupäev</h2>
      <form method="get" action="/" class="stack">
        <label>
          Juuksur:
          <select name="barberId" required>
            <option value="">-- vali --</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id} selected={selectedBarberId === b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kuupäev:
          <input type="date" name="date" value={selectedDate} min={todayIso()} required />
        </label>
        <button type="submit">Näita vabu aegu</button>
      </form>
    </section>

    {selectedBarberId !== null ? (
      <section class="card">
        <h2>2. Vaba aeg ja kontaktandmed</h2>
        {availableSlots.length === 0 ? (
          <p>Selleks päevaks pole vabu aegu.</p>
        ) : (
          <form method="post" action="/book" class="stack">
            <input type="hidden" name="_csrf" value={csrfToken} />
            <input type="hidden" name="barberId" value={selectedBarberId} />
            <input type="hidden" name="date" value={selectedDate} />

            <fieldset>
              <legend>Vali aeg:</legend>
              <div class="slot-grid">
                {availableSlots.map((slot) => {
                  const value = slot.toISOString();
                  const checked = prefill?.startTime === value;
                  return (
                    <label key={value} class="slot">
                      <input
                        type="radio"
                        name="startTime"
                        value={value}
                        required
                        checked={checked}
                      />
                      <span>{formatTime(slot)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label>
              Nimi:
              <input
                type="text"
                name="customerName"
                required
                minLength={2}
                maxLength={100}
                value={prefill?.customerName ?? ""}
              />
            </label>
            <label>
              Telefon:
              <input
                type="tel"
                name="customerPhone"
                required
                minLength={5}
                maxLength={30}
                pattern="[0-9+\s\-()]+"
                value={prefill?.customerPhone ?? ""}
              />
            </label>
            <label>
              E-post (valikuline):
              <input
                type="email"
                name="customerEmail"
                maxLength={200}
                value={prefill?.customerEmail ?? ""}
              />
            </label>
            <button type="submit">Kinnita broneering</button>
          </form>
        )}
      </section>
    ) : null}
  </Layout>
);
