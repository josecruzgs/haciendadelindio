import "server-only";
import { query } from "./db";
import { todayKey } from "./dates";

/**
 * Limpieza de la base de datos: borra reservaciones (y bloqueos de fechas) cuya salida
 * fue hace más de N meses, para que la base no se llene. Configurable en /admin/ajustes.
 */

export type CleanupSettings = {
  /** Borrar automáticamente (como máximo una vez al día, al abrir el panel). */
  auto: boolean;
  /** Antigüedad en meses, contada desde la fecha de salida. */
  months: number;
  /** Límite de almacenamiento del plan, para la barra de uso (Neon gratis: 512 MB). */
  limitMb: number;
  lastRun?: string;
  lastDeleted?: number;
};

export const DEFAULT_CLEANUP: CleanupSettings = { auto: false, months: 3, limitMb: 512 };
export const MIN_MONTHS = 1;
export const MAX_MONTHS = 60;

/** Fecha de corte (YYYY-MM-DD): hoy menos `months` meses. */
export function cutoffKey(months: number, today = todayKey()) {
  const d = new Date(`${today}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  // Si el mes destino es más corto (p. ej. 31 → febrero), usar su último día
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export async function getCleanup(): Promise<CleanupSettings> {
  const [row] = await query<{ value: string }>(`SELECT value FROM settings WHERE key = 'cleanup'`);
  try {
    return { ...DEFAULT_CLEANUP, ...(row ? (JSON.parse(row.value) as Partial<CleanupSettings>) : {}) };
  } catch {
    return DEFAULT_CLEANUP;
  }
}

export async function saveCleanup(c: CleanupSettings) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('cleanup', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(c)],
  );
}

/** Cuántas reservaciones y bloqueos se borrarían con esa fecha de corte. */
export async function countOld(cutoff: string) {
  const [row] = await query<{ reservations: number; blocks: number }>(
    `SELECT (SELECT COUNT(*)::int FROM reservations WHERE check_out < $1::date) AS reservations,
            (SELECT COUNT(*)::int FROM blocked_dates WHERE end_date < $1::date) AS blocks`,
    [cutoff],
  );
  return row;
}

export async function purgeOld(cutoff: string) {
  const res = await query<{ id: number }>(`DELETE FROM reservations WHERE check_out < $1::date RETURNING id`, [cutoff]);
  await query(`DELETE FROM blocked_dates WHERE end_date < $1::date`, [cutoff]);
  return res.length;
}

/** Espacio usado por la base y resumen de reservaciones. */
export async function dbUsage() {
  const [row] = await query<{ bytes: string | number; total: number; oldest: string | null }>(
    `SELECT pg_database_size(current_database()) AS bytes,
            (SELECT COUNT(*)::int FROM reservations) AS total,
            (SELECT MIN(check_out)::text FROM reservations) AS oldest`,
  );
  return { bytes: Number(row.bytes), total: row.total, oldest: row.oldest };
}

/** Limpieza automática: como máximo una vez al día, solo si está activada. No interrumpe el panel si falla. */
export async function maybeAutoPurge() {
  try {
    const c = await getCleanup();
    if (!c.auto) return;
    const today = todayKey();
    if (c.lastRun === today) return;
    const deleted = await purgeOld(cutoffKey(c.months, today));
    await saveCleanup({ ...c, lastRun: today, lastDeleted: deleted });
  } catch (e) {
    console.error("[limpieza] no se pudo ejecutar la limpieza automática", e);
  }
}
