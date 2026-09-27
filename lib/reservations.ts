import "server-only";
import { query } from "./db";
import { addDaysKey } from "./dates";
import type { Room } from "@/data/rooms";

export const STATUSES = ["pendiente", "confirmada", "completada", "cancelada"] as const;
export type Status = (typeof STATUSES)[number];
export type Channel = "directa" | "whatsapp" | "recepcion";

export type Reservation = {
  id: number;
  code: string;
  status: Status;
  source: "web" | "admin";
  channel: Channel;
  room: Room["slug"];
  rooms: number;
  adults: number;
  children: number;
  check_in: string;
  check_out: string;
  nights: number;
  breakfast: boolean;
  total: number;
  promo_total: number | null;
  name: string;
  phone: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Block = { id: number; room: Room["slug"] | null; start_date: string; end_date: string; reason: string | null };

// Las fechas se leen como texto para evitar corrimientos de zona horaria.
const COLS = `id, code, status, source, channel, room, rooms, adults, children,
  check_in::text AS check_in, check_out::text AS check_out, nights, breakfast, total, promo_total,
  name, phone, notes, admin_notes, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`;

export type NewReservation = Omit<Reservation, "id" | "code" | "created_at" | "updated_at" | "admin_notes"> & {
  admin_notes?: string | null;
};

export async function insertReservation(r: NewReservation) {
  const [row] = await query<{ id: number }>(
    `INSERT INTO reservations (status, source, channel, room, rooms, adults, children, check_in, check_out, nights,
       breakfast, total, promo_total, name, phone, notes, admin_notes)
     VALUES ($1,$2,$17,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
    [r.status, r.source, r.room, r.rooms, r.adults, r.children, r.check_in, r.check_out, r.nights,
     r.breakfast, r.total, r.promo_total, r.name, r.phone, r.notes, r.admin_notes ?? null, r.channel],
  );
  const [{ n }] = await query<{ n: number }>(
    `INSERT INTO counters (name, n) VALUES ('reservation', 1)
     ON CONFLICT (name) DO UPDATE SET n = counters.n + 1 RETURNING n`,
  );
  const code = `HDI-${String(n).padStart(5, "0")}`;
  await query(`UPDATE reservations SET code = $1 WHERE id = $2`, [code, row.id]);
  return { id: row.id, code };
}

export async function getReservation(id: number) {
  const [row] = await query<Reservation>(`SELECT ${COLS} FROM reservations WHERE id = $1`, [id]);
  return row ?? null;
}

export async function listReservations(opts: { status?: Status | "todas"; q?: string; limit?: number } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status && opts.status !== "todas") {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim().toLowerCase()}%`);
    const conds = [`LOWER(name) LIKE $${params.length}`, `LOWER(code) LIKE $${params.length}`];
    const digits = opts.q.replace(/\D/g, "");
    if (digits.length >= 3) {
      params.push(`%${digits}%`);
      conds.push(`REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE $${params.length}`);
    }
    where.push(`(${conds.join(" OR ")})`);
  }
  params.push(opts.limit ?? 200);
  return query<Reservation>(
    `SELECT ${COLS} FROM reservations ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
}

export async function updateReservation(id: number, fields: { status?: Status; admin_notes?: string | null }) {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.status) {
    params.push(fields.status);
    sets.push(`status = $${params.length}`);
  }
  if (fields.admin_notes !== undefined) {
    params.push(fields.admin_notes);
    sets.push(`admin_notes = $${params.length}`);
  }
  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE reservations SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

export async function dashboardStats(today: string) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const [row] = await query<{
    pending: number; arrivals: number; departures: number; in_house: number; month_revenue: number; month_nights: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pendiente')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'confirmada' AND check_in = $1::date)::int AS arrivals,
       COUNT(*) FILTER (WHERE status = 'confirmada' AND check_out = $1::date)::int AS departures,
       COALESCE(SUM(rooms) FILTER (WHERE status = 'confirmada' AND check_in <= $1::date AND check_out > $1::date), 0)::int AS in_house,
       COALESCE(SUM(total) FILTER (WHERE status IN ('confirmada','completada') AND check_in >= $2::date AND check_in < ($2::date + INTERVAL '1 month')), 0)::int AS month_revenue,
       COALESCE(SUM(nights * rooms) FILTER (WHERE status IN ('confirmada','completada') AND check_in >= $2::date AND check_in < ($2::date + INTERVAL '1 month')), 0)::int AS month_nights
     FROM reservations`,
    [today, monthStart],
  );
  return row;
}

export async function upcomingArrivals(today: string, days = 7) {
  return query<Reservation>(
    `SELECT ${COLS} FROM reservations
     WHERE status = 'confirmada' AND check_in >= $1::date AND check_in <= $2::date
     ORDER BY check_in, created_at`,
    [today, addDaysKey(today, days)],
  );
}

/* ---------- Bloqueos de disponibilidad ---------- */

export async function listBlocks(fromKey?: string) {
  return query<Block>(
    `SELECT id, room, start_date::text AS start_date, end_date::text AS end_date, reason
     FROM blocked_dates ${fromKey ? "WHERE end_date >= $1::date" : ""} ORDER BY start_date`,
    fromKey ? [fromKey] : [],
  );
}

export async function insertBlock(b: Omit<Block, "id">) {
  await query(`INSERT INTO blocked_dates (room, start_date, end_date, reason) VALUES ($1, $2, $3, $4)`, [
    b.room, b.start_date, b.end_date, b.reason,
  ]);
}

export async function deleteBlock(id: number) {
  await query(`DELETE FROM blocked_dates WHERE id = $1`, [id]);
}

/** Noches bloqueadas (YYYY-MM-DD) por tipo de habitación a partir de hoy. `all` aplica a todas. */
export async function blockedNights(today: string) {
  const blocks = await listBlocks(today);
  const sets: Record<"all" | Room["slug"], Set<string>> = { all: new Set(), sencilla: new Set(), doble: new Set(), triple: new Set() };
  for (const b of blocks) {
    const key = b.room ?? "all";
    for (let d = b.start_date < today ? today : b.start_date; d <= b.end_date; d = addDaysKey(d, 1)) sets[key].add(d);
  }
  return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...v].sort()])) as Record<"all" | Room["slug"], string[]>;
}

/** ¿Alguna noche del rango [checkIn, checkOut) está bloqueada para esa habitación? */
export async function isRangeBlocked(room: Room["slug"], checkIn: string, checkOut: string) {
  const [row] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM blocked_dates
     WHERE (room IS NULL OR room = $1) AND start_date < $3::date AND end_date >= $2::date`,
    [room, checkIn, checkOut],
  );
  return row.n > 0;
}
