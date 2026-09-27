/** Fechas del lado del servidor, siempre en la zona horaria del hotel (Mexicali). */

export const HOTEL_TZ = "America/Tijuana";

/** Hoy en Mexicali como YYYY-MM-DD. */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TZ }).format(now);
}

export const isDateKey = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Noches entre dos claves YYYY-MM-DD. */
export const nightsBetweenKeys = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export const addDaysKey = (k: string, n: number) => {
  const d = new Date(`${k}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Como fmtKey pero con la primera letra en mayúscula ("Martes, 29 de septiembre de 2026"). */
export const fmtKeyCap = (k: string, opts?: Intl.DateTimeFormatOptions) => cap(fmtKey(k, opts));

/** "vie 2 oct 2026" */
export const fmtKey = (k: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("es-MX", { ...opts, timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`));
