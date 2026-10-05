import "server-only";
import { query } from "./db";
import { HOTEL_TZ } from "./dates";
import { getBooking } from "./settings";
import { stripeEnabled } from "./stripe";
import { HOLD_GRACE_MIN } from "./reservations";
import { rooms as roomTypes, type Room } from "@/data/rooms";

/**
 * Disponibilidad real por tipo de habitación: habitaciones activas de ese tipo menos las
 * reservaciones que ocupan cada noche. Ocupan: pendientes, confirmadas, hospedadas (aunque ya
 * pasó su salida) y por pagar (las automáticas solo mientras su apartado sigue vigente).
 */

/** Condición SQL: la reservación `r` ocupa la noche `d`. */
const OCCUPIES = (r: string, d: string) => `(
  ${r}.check_in <= ${d} AND (
    (${r}.status IN ('pendiente', 'confirmada') AND ${r}.check_out > ${d})
    OR (${r}.status = 'hospedado' AND GREATEST(${r}.check_out, (NOW() AT TIME ZONE '${HOTEL_TZ}')::date + 1) > ${d})
    OR (${r}.status = 'por_pagar' AND ${r}.check_out > ${d}
        AND (${r}.hold_until IS NULL OR ${r}.hold_until > NOW() - INTERVAL '${HOLD_GRACE_MIN} minutes'))
  ))`;

/** Habitaciones activas por tipo. */
export async function inventory() {
  const rows = await query<{ type: Room["slug"]; n: number }>(
    `SELECT type, COUNT(*)::int AS n FROM hotel_rooms WHERE active GROUP BY type`,
  );
  return Object.fromEntries(roomTypes.map((t) => [t.slug, rows.find((r) => r.type === t.slug)?.n ?? 0])) as Record<Room["slug"], number>;
}

/**
 * Habitaciones libres de ese tipo en todas las noches de [checkIn, checkOut) (el mínimo).
 * `upToId`: cuenta solo las reservaciones con id menor o igual (para resolver empates entre dos
 * huéspedes que reservan la última habitación al mismo tiempo: gana la que se guardó primero).
 */
export async function freeCount(type: Room["slug"], checkIn: string, checkOut: string, opts: { exceptId?: number; upToId?: number } = {}) {
  const [row] = await query<{ free: number | null }>(
    `SELECT MIN(inv.n - COALESCE((
        SELECT SUM(r.rooms) FROM reservations r
        WHERE r.room = $1 AND r.id <> $4 AND ($5::int IS NULL OR r.id <= $5) AND ${OCCUPIES("r", "nights.d")}
      ), 0))::int AS free
     FROM (SELECT generate_series($2::date, $3::date - 1, INTERVAL '1 day')::date AS d) nights,
          (SELECT COUNT(*)::int AS n FROM hotel_rooms WHERE active AND type = $1) inv`,
    [type, checkIn, checkOut, opts.exceptId ?? 0, opts.upToId ?? null],
  );
  return row?.free ?? 0;
}

/** Noches llenas (YYYY-MM-DD) por tipo, desde hoy y por `days` días, de los tipos con inventario. */
export async function fullNights(today: string, days = 366) {
  const rows = await query<{ type: Room["slug"]; d: string }>(
    `SELECT inv.type, nights.d::text AS d
     FROM (SELECT generate_series($1::date, $1::date + $2::int, INTERVAL '1 day')::date AS d) nights,
          (SELECT type, COUNT(*)::int AS n FROM hotel_rooms WHERE active GROUP BY type) inv
     WHERE inv.n - COALESCE((
       SELECT SUM(r.rooms) FROM reservations r WHERE r.room = inv.type AND ${OCCUPIES("r", "nights.d")}
     ), 0) <= 0
     ORDER BY 2`,
    [today, days],
  );
  const out = Object.fromEntries(roomTypes.map((t) => [t.slug, [] as string[]])) as Record<Room["slug"], string[]>;
  for (const r of rows) out[r.type]?.push(r.d);
  return out;
}

/**
 * ¿Se reserva y cobra en automático este tipo? Requiere la opción activada en Ajustes,
 * Stripe configurado y habitaciones de ese tipo dadas de alta. Si no, sigue el flujo manual.
 */
export async function autoBookingFor(type?: Room["slug"]) {
  const [booking, inv] = await Promise.all([getBooking(), inventory()]);
  const on = booking.auto && stripeEnabled();
  return { on: on && (type ? inv[type] > 0 : Object.values(inv).some((n) => n > 0)), booking, inv };
}

/** Para el widget público: datos de la reserva automática, o null si sigue el flujo manual (o falla la base). */
export async function publicAutoBooking() {
  try {
    const a = await autoBookingFor();
    return a.on ? { holdMinutes: a.booking.holdMinutes } : null;
  } catch (e) {
    console.error("[disponibilidad] no se pudo leer la reserva automática", e);
    return null;
  }
}
