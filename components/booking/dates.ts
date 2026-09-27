/** Utilidades de fechas locales (sin horas) usando claves YYYY-MM-DD. */

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const nightsBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtShort = (d: Date) =>
  cap(new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(d));

export const fmtLong = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);

export const fmtMonth = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(d);

/** Celdas de un mes empezando en lunes (incluye días del mes anterior/siguiente para completar semanas). */
export function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = addDays(first, -offset);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells = Math.ceil((offset + last.getDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDays(start, i));
}
