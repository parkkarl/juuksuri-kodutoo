// Broneeringute mudel — andmebaasiga suhtlemine broneeringute osas.
import postgres from "postgres";
import { sql } from "~/db/client";

export interface Booking {
  id: number;
  barber_id: number;
  start_time: Date;
  end_time: Date;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  created_at: Date;
}

export interface BookingWithBarber extends Booking {
  barber_name: string;
}

export interface CreateBookingInput {
  barberId: number;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
}

/**
 * Loo broneering atomaarselt.
 *
 * Tagastab null, kui sama juuksur on samal algusajal juba broneeritud
 * (UNIQUE constraint blokeerib). See on topeltbroneeringu tõke ka
 * samaaegsete päringute korral — andmebaas hoolitseb atomaarsuse eest.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking | null> {
  try {
    const rows = await sql<Booking[]>`
      INSERT INTO bookings (
        barber_id, start_time, end_time,
        customer_name, customer_phone, customer_email
      ) VALUES (
        ${input.barberId}, ${input.startTime}, ${input.endTime},
        ${input.customerName}, ${input.customerPhone}, ${input.customerEmail}
      )
      RETURNING id, barber_id, start_time, end_time,
                customer_name, customer_phone, customer_email, created_at
    `;
    return rows[0] ?? null;
  } catch (err) {
    // Postgres error code 23505 = unique_violation
    if (err instanceof postgres.PostgresError && err.code === "23505") {
      return null;
    }
    throw err;
  }
}

/**
 * Tagasta broneeringu algusajad, mis on ühel päeval ühel juuksuril
 * juba broneeritud. Kasutatud vabade aegade arvutamiseks.
 */
export async function findBookedStartTimes(
  barberId: number,
  dayStart: Date,
  dayEnd: Date,
): Promise<Date[]> {
  const rows = await sql<{ start_time: Date }[]>`
    SELECT start_time FROM bookings
    WHERE barber_id = ${barberId}
      AND start_time >= ${dayStart}
      AND start_time <  ${dayEnd}
    ORDER BY start_time
  `;
  return rows.map((r) => r.start_time);
}

/**
 * Admin-vaate jaoks: broneeringud koos juuksuri nimega,
 * filtreerituna kuupäeva järgi (või kõik, kui date=null).
 */
export async function listBookings(filter: {
  date: string | null;
}): Promise<BookingWithBarber[]> {
  if (filter.date) {
    return await sql<BookingWithBarber[]>`
      SELECT b.id, b.barber_id, b.start_time, b.end_time,
             b.customer_name, b.customer_phone, b.customer_email, b.created_at,
             br.name AS barber_name
      FROM bookings b
      JOIN barbers br ON br.id = b.barber_id
      WHERE b.start_time::date = ${filter.date}::date
      ORDER BY b.start_time ASC
    `;
  }
  return await sql<BookingWithBarber[]>`
    SELECT b.id, b.barber_id, b.start_time, b.end_time,
           b.customer_name, b.customer_phone, b.customer_email, b.created_at,
           br.name AS barber_name
    FROM bookings b
    JOIN barbers br ON br.id = b.barber_id
    ORDER BY b.start_time DESC
    LIMIT 200
  `;
}
