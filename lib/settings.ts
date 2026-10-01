import "server-only";
import { query } from "./db";
import { BUILTIN_TEMPLATES, DEFAULT_CUSTOM_TEMPLATES, type Template } from "./templates";

/** Cuánto se cobra en línea al enviar la liga de pago. */
export type AdvanceSettings = {
  /** total = 100 %; porcentaje = `value` %; fijo = `value` pesos (sin pasar del total). */
  mode: "total" | "porcentaje" | "fijo";
  value: number;
  /** Usar la tarifa promo (3+ noches) como total cuando se paga por adelantado. */
  applyPromo: boolean;
};

export type Settings = { advance: AdvanceSettings; templates: Template[] };

export const DEFAULT_ADVANCE: AdvanceSettings = { mode: "total", value: 100, applyPromo: true };

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

export async function saveSetting(key: "advance" | "templates", value: unknown) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}

/** Total a cobrar de la estancia y monto del pago en línea según los ajustes. */
export function computeCharge(a: AdvanceSettings, r: { total: number; promo_total: number | null }) {
  const total = a.applyPromo && r.promo_total != null ? r.promo_total : r.total;
  let due = total;
  if (a.mode === "porcentaje") due = Math.round((total * Math.min(100, Math.max(1, a.value))) / 100);
  else if (a.mode === "fijo") due = Math.min(total, Math.max(0, Math.round(a.value)));
  return { total, due };
}

export const advanceLabel = (a: AdvanceSettings) =>
  a.mode === "porcentaje" ? `Anticipo del ${a.value} %` : a.mode === "fijo" ? `Anticipo fijo` : "Pago total";
