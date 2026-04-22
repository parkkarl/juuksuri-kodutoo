// Avalik broneerimisvaade — näita vabu aegu, võta vastu broneering.
import { type Context, Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { requireCsrf } from "~/middleware/csrf";
import type { SessionContext } from "~/middleware/session";
import { findBarberById, listBarbers } from "~/models/barber.model";
import { createBooking, findBookedStartTimes } from "~/models/booking.model";
import {
  SLOT_MINUTES,
  endOfDay,
  generateDaySlots,
  isValidSlotStart,
  parseIsoDate,
  todayIso,
} from "~/utils/time";
import { BookingPage } from "~/views/booking-page";
import { ConfirmationPage } from "~/views/confirmation-page";

export const publicController = new Hono<SessionContext>();

// GET / — broneerimisvorm. Kui barberId ja date on antud, näita vabu aegu.
publicController.get("/", async (c) => {
  const barbers = await listBarbers();
  const csrfToken = c.get("csrfToken");

  const barberIdRaw = c.req.query("barberId");
  const dateRaw = c.req.query("date") ?? todayIso();

  let selectedBarberId: number | null = null;
  let availableSlots: Date[] = [];

  const barberId = barberIdRaw ? Number.parseInt(barberIdRaw, 10) : Number.NaN;
  if (!Number.isNaN(barberId)) {
    const barber = await findBarberById(barberId);
    if (barber) {
      const dayStart = parseIsoDate(dateRaw);
      if (dayStart) {
        selectedBarberId = barber.id;
        const allSlots = generateDaySlots(dayStart);
        const booked = new Set(
          (await findBookedStartTimes(barber.id, dayStart, endOfDay(dayStart))).map((d) =>
            d.getTime(),
          ),
        );
        // Kui kuupäev on täna, peida juba möödunud ajad.
        const now = Date.now();
        availableSlots = allSlots.filter((s) => !booked.has(s.getTime()) && s.getTime() > now);
      }
    }
  }

  return c.html(
    <BookingPage
      barbers={barbers}
      csrfToken={csrfToken}
      selectedBarberId={selectedBarberId}
      selectedDate={dateRaw}
      availableSlots={availableSlots}
      message={null}
    />,
  );
});

// Broneeringu sisendi valideerimine Zodiga — üks autoriteet kõikide piirangute üle.
const bookingSchema = z.object({
  barberId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().datetime(), // ISO 8601
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z
    .string()
    .trim()
    .min(5)
    .max(30)
    .regex(/^[0-9+\s\-()]+$/, "Telefoninumber sisaldab lubamatuid märke"),
  customerEmail: z
    .string()
    .trim()
    .max(200)
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// POST /book — töötle broneering.
publicController.post("/book", requireCsrf, async (c) => {
  const form = await c.req.parseBody();
  const parsed = bookingSchema.safeParse(form);

  const barbers = await listBarbers();
  const csrfToken = c.get("csrfToken");

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: firstIssue?.message ?? "Sisendandmed ei ole korrektsed.",
    });
  }

  const data = parsed.data;
  const barber = await findBarberById(data.barberId);
  if (!barber) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Valitud juuksurit ei leitud.",
    });
  }

  const dayStart = parseIsoDate(data.date);
  if (!dayStart) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Ebasobiv kuupäev.",
    });
  }

  const startTime = new Date(data.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Ebasobiv algusaeg.",
    });
  }

  // Äriloogika: slot peab olema tööaja sees ja tulevikus.
  if (!isValidSlotStart(startTime, dayStart)) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Valitud aeg ei ole saadaval.",
    });
  }
  if (startTime.getTime() <= Date.now()) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Algusaeg peab olema tulevikus.",
    });
  }

  const endTime = new Date(startTime.getTime() + SLOT_MINUTES * 60_000);

  // ATOMAARNE LOOMINE: UNIQUE constraint andmebaasi tasemel välistab
  // topeltbroneeringu ka samaaegsete päringute korral. Kui INSERT
  // ebaõnnestub unique_violation-iga, saame null.
  const booking = await createBooking({
    barberId: barber.id,
    startTime,
    endTime,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail ?? null,
  });

  if (!booking) {
    return renderBookingError(c, {
      barbers,
      csrfToken,
      raw: form,
      errorText: "Valitud aeg on vahepeal broneeritud. Palun vali teine aeg.",
    });
  }

  return c.html(
    <ConfirmationPage
      barberName={barber.name}
      startTime={booking.start_time}
      customerName={booking.customer_name}
    />,
  );
});

// Abiline: näita vea korral broneerimislehte uuesti, säilitades vormi sisu.
async function renderBookingError(
  c: Context<SessionContext>,
  opts: {
    barbers: Awaited<ReturnType<typeof listBarbers>>;
    csrfToken: string;
    raw: Record<string, unknown>;
    errorText: string;
  },
) {
  const barberId = Number.parseInt(String(opts.raw.barberId ?? ""), 10);
  const dateStr = String(opts.raw.date ?? todayIso());
  const dayStart = parseIsoDate(dateStr);

  let availableSlots: Date[] = [];
  let selectedBarberId: number | null = null;

  if (!Number.isNaN(barberId) && dayStart) {
    const barber = await findBarberById(barberId);
    if (barber) {
      selectedBarberId = barber.id;
      const allSlots = generateDaySlots(dayStart);
      const booked = new Set(
        (await findBookedStartTimes(barber.id, dayStart, endOfDay(dayStart))).map((d) =>
          d.getTime(),
        ),
      );
      const now = Date.now();
      availableSlots = allSlots.filter((s) => !booked.has(s.getTime()) && s.getTime() > now);
    }
  }

  return c.html(
    <BookingPage
      barbers={opts.barbers}
      csrfToken={opts.csrfToken}
      selectedBarberId={selectedBarberId}
      selectedDate={dateStr}
      availableSlots={availableSlots}
      message={{ type: "error", text: opts.errorText }}
      prefill={{
        customerName: String(opts.raw.customerName ?? ""),
        customerPhone: String(opts.raw.customerPhone ?? ""),
        customerEmail: String(opts.raw.customerEmail ?? ""),
        startTime: String(opts.raw.startTime ?? ""),
      }}
    />,
    400 as ContentfulStatusCode,
  );
}
