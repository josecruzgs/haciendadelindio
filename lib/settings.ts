import "server-only";
import { query } from "./db";
import { BUILTIN_TEMPLATES, DEFAULT_CUSTOM_TEMPLATES, type Template } from "./templates";

/** Cuánto se cobra en línea al enviar la liga de pago. */
export type AdvanceSettings = {
  /** total = 100 %; porcentaje = `value` %; fijo = `value` pesos (sin pasar del total). */
  mode: "total" | "porcentaje" | "fijo";
  value: number;
};

export type Settings = { advance: AdvanceSettings; templates: Template[] };

export const DEFAULT_ADVANCE: AdvanceSettings = { mode: "total", value: 100 };

/** Stripe no acepta cobros menores a $10 MXN. */
export const STRIPE_MIN_MXN = 10;

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const parse = <T,>(k: string): T | null => {
    try {
      return map.has(k) ? (JSON.parse(map.get(k)!) as T) : null;
    } catch {
      return null;
    }
  };

  const advance = { ...DEFAULT_ADVANCE, ...(parse<Partial<AdvanceSettings>>("advance") ?? {}) };
  const saved = parse<Template[]>("templates");
  // Las plantillas del sistema siempre existen (con el texto guardado si lo hay)
  const templates = saved
    ? [
        ...BUILTIN_TEMPLATES.map((b) => ({ ...b, ...saved.find((s) => s.id === b.id), builtin: true })),
        ...saved.filter((s) => !BUILTIN_TEMPLATES.some((b) => b.id === s.id)).map((s) => ({ ...s, builtin: false })),
      ]
    : [...BUILTIN_TEMPLATES, ...DEFAULT_CUSTOM_TEMPLATES];
  return { advance, templates };
}

/** Reserva automática: si hay disponibilidad, el huésped paga en línea y se confirma sola. */
export type BookingSettings = {
  auto: boolean;
  /** Minutos que se aparta la habitación mientras el huésped paga (Stripe pide de 30 a 1440). */
  holdMinutes: number;
  /** Horarios del hotel ("15:00"); vacío = no se muestra. Aparecen en el recibo de pago. */
  checkInTime: string;
  checkOutTime: string;
};

export const DEFAULT_BOOKING: BookingSettings = { auto: true, holdMinutes: 60, checkInTime: "15:00", checkOutTime: "" };
export const MIN_HOLD = 30;
export const MAX_HOLD = 1440;

export async function getBooking(): Promise<BookingSettings> {
  const [row] = await query<{ value: string }>(`SELECT value FROM settings WHERE key = 'booking'`);
  try {
    return { ...DEFAULT_BOOKING, ...(row ? (JSON.parse(row.value) as Partial<BookingSettings>) : {}) };
  } catch {
    return DEFAULT_BOOKING;
  }
}

export async function saveSetting(key: "advance" | "templates" | "booking", value: unknown) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}

/**
 * Total a cobrar de la estancia y monto del pago en línea según los ajustes.
 * Si la reservación califica para la promo y la promo sigue activa, el total es el precio promo (pago anticipado).
 */
export function computeCharge(a: AdvanceSettings, r: { total: number; promo_total: number | null }, promoEnabled: boolean) {
  const total = promoEnabled && r.promo_total != null ? r.promo_total : r.total;
  let due = total;
  if (a.mode === "porcentaje") due = Math.round((total * Math.min(100, Math.max(1, a.value))) / 100);
  else if (a.mode === "fijo") due = Math.min(total, Math.max(0, Math.round(a.value)));
  return { total, due };
}

export const advanceLabel = (a: AdvanceSettings) =>
  a.mode === "porcentaje" ? `Anticipo del ${a.value} %` : a.mode === "fijo" ? `Anticipo fijo` : "Pago total";
