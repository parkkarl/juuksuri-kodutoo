// Slot-arvutused. Kõikide broneeringute pikkus on SLOT_MINUTES
// (lihtne MVP; päris salongis oleks teenusepikkus parameeter).
//
// Töötame Euroopa/Tallinn ajatsoonis, aga andmebaas hoiab TIMESTAMPTZ
// ehk UTC — teisendused toimuvad serveri ajatsooni (TZ=Europe/Tallinn)
// kaudu, mis on seatud Dockerfile-s.

export const SLOT_MINUTES = 30;
export const WORKDAY_START_HOUR = 10; // 10:00
export const WORKDAY_END_HOUR = 18; //   18:00

/** ISO kuupäev (YYYY-MM-DD) → päeva algus lokaalses ajas (Date) */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** Genereeri kõik slot-algusajad antud kuupäeval (lokaalne aeg). */
export function generateDaySlots(dayStart: Date): Date[] {
  const slots: Date[] = [];
  const cursor = new Date(dayStart);
  cursor.setHours(WORKDAY_START_HOUR, 0, 0, 0);

  const end = new Date(dayStart);
  end.setHours(WORKDAY_END_HOUR, 0, 0, 0);

  while (cursor < end) {
    slots.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }
  return slots;
}

/** Päeva lõpp (järgmise päeva algus 00:00 lokaalses ajas) */
export function endOfDay(dayStart: Date): Date {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Kontrolli, kas slot-aeg on valiidne (täpselt slot-rea peal). */
export function isValidSlotStart(start: Date, dayStart: Date): boolean {
  const slots = generateDaySlots(dayStart);
  return slots.some((s) => s.getTime() === start.getTime());
}

/** Formaat HH:MM lokaalses ajas */
export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Formaat YYYY-MM-DD lokaalses ajas */
export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formaat DD.MM.YYYY HH:MM lokaalses ajas */
export function formatDateTime(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}.${d.getFullYear()} ${formatTime(d)}`;
}

/** Tänane päev ISO formaadis (lokaalne) */
export function todayIso(): string {
  return formatIsoDate(new Date());
}
