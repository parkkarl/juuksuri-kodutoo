// Mudel = andmetega töötamine. Siin on AINULT juuksuritega seotud
// andmebaasi päringud. Kontroller ei pea SQL-i teadma.
import { sql } from "~/db/client";

export interface Barber {
  id: number;
  name: string;
}

export async function listBarbers(): Promise<Barber[]> {
  return await sql<Barber[]>`
    SELECT id, name FROM barbers ORDER BY name ASC
  `;
}

export async function findBarberById(id: number): Promise<Barber | null> {
  const rows = await sql<Barber[]>`
    SELECT id, name FROM barbers WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}
