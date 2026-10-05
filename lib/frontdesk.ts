import "server-only";
import { query } from "./db";
import { HOTEL_TZ } from "./dates";
import type { Room } from "@/data/rooms";
import type { Status } from "./reservations";

/**
 * Recepción: habitaciones físicas, asignación a reservaciones, entrada/salida y pagos en mostrador.
 *
 * Una habitación está ocupada en una noche si tiene asignada una reservación activa
 * (pendiente, por pagar, confirmada u hospedada) cuya estancia incluye esa noche.
 * Las completadas liberan la habitación desde el día en que registraron su salida.
 */

export const HOUSEKEEPING = ["limpia", "sucia", "mantenimiento"] as const;
export type Housekeeping = (typeof HOUSEKEEPING)[number];

export const PAY_METHODS = ["efectivo", "tarjeta", "transferencia"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/** Estados que apartan la habitación. */
export const OCCUPYING: Status[] = ["pendiente", "por_pagar", "confirmada", "hospedado"];
const OCCUPYING_SQL = `('pendiente', 'por_pagar', 'confirmada', 'hospedado')`;

export type HotelRoom = {
  id: number;
  number: string;
  type: Room["slug"];
  housekeeping: Housekeeping;
  notes: string | null;
  active: boolean;
};

/** Una estancia en una habitación (o sin asignar, room_id = null) para el rack y el calendario. */
export type Stay = {
  room_id: number | null;
  reservation_id: number;
  code: string;
  name: string;
  status: Status;
  room_type: Room["slug"];
  rooms: number;
  check_in: string;
  /** Fin efectivo: la salida, el día en que salió si fue antes, o mañana si sigue hospedado después de su salida. */
  check_out: string;
  /** Salida según la reservación. */
  departure: string;
  paid: boolean;
};

const ROOM_COLS = `id, number, type, housekeeping, notes, active`;

/** Orden natural por número (2 antes que 10). */
const ROOM_ORDER = `ORDER BY NULLIF(REGEXP_REPLACE(number, '\\D', '', 'g'), '')::int NULLS LAST, number`;

export async function listHotelRooms(opts: { includeInactive?: boolean } = {}) {
  return query<HotelRoom>(
    `SELECT ${ROOM_COLS} FROM hotel_rooms ${opts.includeInactive ? "" : "WHERE active"} ${ROOM_ORDER}`,
  );
}

export async function insertHotelRooms(numbers: string[], type: Room["slug"]) {
  const rows = await query<{ number: string }>(
    `INSERT INTO hotel_rooms (number, type)
     SELECT n, $2 FROM UNNEST($1::text[]) AS n
     ON CONFLICT (number) DO NOTHING RETURNING number`,
    [numbers, type],
  );
  return rows.map((r) => r.number);
}

export async function updateHotelRoom(id: number, f: { number: string; type: Room["slug"]; notes: string | null; active: boolean }) {
  const rows = await query<{ id: number }>(
    `UPDATE hotel_rooms SET number = $2, type = $3, notes = $4, active = $5
     WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM hotel_rooms WHERE number = $2 AND id <> $1) RETURNING id`,
    [id, f.number, f.type, f.notes, f.active],
  );
  return rows.length > 0;
}

/** Borra la habitación si nunca se ha usado; si tiene historial solo se da de baja. */
export async function removeHotelRoom(id: number): Promise<"deleted" | "deactivated"> {
  const [{ n }] = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM room_assignments WHERE room_id = $1`, [id]);
  if (n === 0) {
    await query(`DELETE FROM hotel_rooms WHERE id = $1`, [id]);
    return "deleted";
  }
  await query(`UPDATE hotel_rooms SET active = FALSE WHERE id = $1`, [id]);
  return "deactivated";
}

export async function setHousekeeping(id: number, hk: Housekeeping) {
  await query(`UPDATE hotel_rooms SET housekeeping = $2 WHERE id = $1`, [id, hk]);
}

/* ---------- Ocupación ---------- */

// Fin efectivo de la estancia: si ya salió, el día de salida real (al menos una noche);
// si sigue hospedado después de su fecha de salida, la habitación sigue ocupada hasta que registre la salida
const STAY_END = `CASE
  WHEN r.status = 'completada' AND r.checked_out_at IS NOT NULL
    THEN GREATEST(r.check_in + 1, LEAST(r.check_out, (r.checked_out_at AT TIME ZONE '${HOTEL_TZ}')::date))
  WHEN r.status = 'hospedado' THEN GREATEST(r.check_out, (NOW() AT TIME ZONE '${HOTEL_TZ}')::date + 1)
  ELSE r.check_out END`;

const STAY_COLS = `r.id AS reservation_id, r.code, r.name, r.status, r.room AS room_type, r.rooms,
  r.check_in::text AS check_in, (${STAY_END})::text AS check_out,
  r.check_out::text AS departure, (r.paid_at IS NOT NULL) AS paid`;

/** Estancias (asignadas y sin asignar) que tocan alguna noche del rango [from, to). */
export async function staysInRange(from: string, to: string) {
  const overlap = `r.check_in < $2::date AND (${STAY_END}) > $1::date`;
  const active = `r.status IN ${OCCUPYING_SQL.slice(0, -1)}, 'completada')`;
  const [assigned, unassigned] = await Promise.all([
    query<Stay>(
      `SELECT a.room_id, ${STAY_COLS}
       FROM room_assignments a JOIN reservations r ON r.id = a.reservation_id
       WHERE ${active} AND ${overlap} ORDER BY r.check_in`,
      [from, to],
    ),
    // Reservaciones con menos habitaciones asignadas de las que pidieron: una fila por cada habitación faltante
    query<Stay & { missing: number }>(
      `SELECT NULL::int AS room_id, ${STAY_COLS},
              r.rooms - (SELECT COUNT(*)::int FROM room_assignments a WHERE a.reservation_id = r.id) AS missing
       FROM reservations r
       WHERE r.status IN ${OCCUPYING_SQL} AND ${overlap}
         AND r.rooms > (SELECT COUNT(*) FROM room_assignments a WHERE a.reservation_id = r.id)
       ORDER BY r.check_in`,
      [from, to],
    ),
  ]);
  return { assigned, unassigned: unassigned.flatMap(({ missing, ...s }) => Array.from({ length: missing }, () => s)) };
}

/** Habitaciones apartadas (room_id) en alguna noche de [checkIn, checkOut), sin contar la reservación `exceptId`. */
async function busyRoomIds(checkIn: string, checkOut: string, exceptId?: number) {
  const rows = await query<{ room_id: number }>(
    `SELECT DISTINCT a.room_id FROM room_assignments a JOIN reservations r ON r.id = a.reservation_id
     WHERE r.status IN ${OCCUPYING_SQL} AND r.check_in < $2::date AND r.check_out > $1::date AND r.id <> $3`,
    [checkIn, checkOut, exceptId ?? 0],
  );
  return new Set(rows.map((r) => r.room_id));
}

/** Habitaciones activas de ese tipo libres para el rango. */
export async function freeRooms(type: Room["slug"], checkIn: string, checkOut: string, exceptId?: number) {
  const [all, busy] = await Promise.all([listHotelRooms(), busyRoomIds(checkIn, checkOut, exceptId)]);
  return all.filter((r) => r.type === type && !busy.has(r.id));
}

/** Apartados futuros (para que el formulario de alta marque las habitaciones ocupadas según las fechas). */
export async function upcomingAssignments(fromKey: string) {
  return query<{ room_id: number; check_in: string; check_out: string }>(
    `SELECT a.room_id, r.check_in::text AS check_in, r.check_out::text AS check_out
     FROM room_assignments a JOIN reservations r ON r.id = a.reservation_id
     WHERE r.status IN ${OCCUPYING_SQL} AND r.check_out > $1::date`,
    [fromKey],
  );
}

export async function assignedRooms(reservationId: number) {
  return query<HotelRoom>(
    `SELECT ${ROOM_COLS.split(", ").map((c) => `h.${c}`).join(", ")}
     FROM room_assignments a JOIN hotel_rooms h ON h.id = a.room_id WHERE a.reservation_id = $1
     ${ROOM_ORDER.replace(/number/g, "h.number")}`,
    [reservationId],
  );
}

/**
 * Asigna la habitación si está libre en esas fechas. La validación va dentro del INSERT
 * para que dos recepcionistas no puedan apartar la misma habitación a la vez.
 */
export async function assignRoom(reservationId: number, roomId: number) {
  const rows = await query<{ room_id: number }>(
    `INSERT INTO room_assignments (reservation_id, room_id)
     SELECT r.id, h.id FROM reservations r, hotel_rooms h
     WHERE r.id = $1 AND h.id = $2 AND h.active AND h.type = r.room
       AND NOT EXISTS (
         SELECT 1 FROM room_assignments a JOIN reservations o ON o.id = a.reservation_id
         WHERE a.room_id = h.id AND o.id <> r.id AND o.status IN ${OCCUPYING_SQL}
           AND o.check_in < r.check_out AND o.check_out > r.check_in)
     ON CONFLICT DO NOTHING RETURNING room_id`,
    [reservationId, roomId],
  );
  return rows.length > 0;
}

/** Asigna solas las habitaciones libres (primero las limpias, luego por número). Regresa cuántas asignó. */
export async function autoAssign(reservationId: number, type: Room["slug"], checkIn: string, checkOut: string, count: number) {
  const rank = { limpia: 0, sucia: 1, mantenimiento: 2 } as const;
  const free = (await freeRooms(type, checkIn, checkOut, reservationId)).sort((a, b) => rank[a.housekeeping] - rank[b.housekeeping]);
  let n = 0;
  for (const h of free) {
    if (n >= count) break;
    if (await assignRoom(reservationId, h.id)) n++;
  }
  return n;
}

export async function unassignRoom(reservationId: number, roomId: number) {
  await query(`DELETE FROM room_assignments WHERE reservation_id = $1 AND room_id = $2`, [reservationId, roomId]);
}

/* ---------- Entrada, salida y pagos ---------- */

export type GuestData = {
  name: string;
  phone: string;
  guest_email: string | null;
  guest_id: string | null;
  guest_city: string | null;
  vehicle: string | null;
};

export async function saveGuestData(id: number, g: GuestData) {
  await query(
    `UPDATE reservations SET name = $2, phone = $3, guest_email = $4, guest_id = $5, guest_city = $6, vehicle = $7,
       updated_at = NOW() WHERE id = $1`,
    [id, g.name, g.phone, g.guest_email, g.guest_id, g.guest_city, g.vehicle],
  );
}

export async function markCheckedIn(id: number) {
  const rows = await query<{ id: number }>(
    `UPDATE reservations SET status = 'hospedado', checked_in_at = COALESCE(checked_in_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND status IN ('pendiente', 'por_pagar', 'confirmada') RETURNING id`,
    [id],
  );
  return rows.length > 0;
}

/** Registra la salida y manda sus habitaciones a limpieza. */
export async function markCheckedOut(id: number) {
  const rows = await query<{ id: number }>(
    `UPDATE reservations SET status = 'completada', checked_out_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'hospedado' RETURNING id`,
    [id],
  );
  if (!rows.length) return false;
  await query(
    `UPDATE hotel_rooms SET housekeeping = 'sucia'
     WHERE housekeeping <> 'mantenimiento' AND id IN (SELECT room_id FROM room_assignments WHERE reservation_id = $1)`,
    [id],
  );
  return true;
}

/** Deshace la salida (p. ej. se registró por error). */
export async function undoCheckOut(id: number) {
  await query(
    `UPDATE reservations SET status = 'hospedado', checked_out_at = NULL, updated_at = NOW() WHERE id = $1 AND status = 'completada'`,
    [id],
  );
}

export type DeskPayment = { id: number; amount: number; method: PayMethod; note: string | null; created_at: string };

export async function listDeskPayments(reservationId: number) {
  return query<DeskPayment>(
    `SELECT id, amount, method, note, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM desk_payments WHERE reservation_id = $1 ORDER BY created_at`,
    [reservationId],
  );
}

export async function addDeskPayment(reservationId: number, amount: number, method: PayMethod, note: string | null) {
  await query(`INSERT INTO desk_payments (reservation_id, amount, method, note) VALUES ($1, $2, $3, $4)`, [
    reservationId, amount, method, note,
  ]);
  await query(
    `UPDATE reservations SET desk_paid = (SELECT COALESCE(SUM(amount), 0) FROM desk_payments WHERE reservation_id = $1),
       updated_at = NOW() WHERE id = $1`,
    [reservationId],
  );
}

export async function deleteDeskPayment(reservationId: number, paymentId: number) {
  await query(`DELETE FROM desk_payments WHERE id = $1 AND reservation_id = $2`, [paymentId, reservationId]);
  await query(
    `UPDATE reservations SET desk_paid = (SELECT COALESCE(SUM(amount), 0) FROM desk_payments WHERE reservation_id = $1),
       updated_at = NOW() WHERE id = $1`,
    [reservationId],
  );
}

/* ---------- Movimientos del día ---------- */

export type Movement = {
  id: number;
  code: string;
  name: string;
  status: Status;
  room: Room["slug"];
  rooms: number;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  total: number;
  charge_total: number | null;
  amount_paid: number | null;
  desk_paid: number;
  paid_at: string | null;
  room_numbers: string[];
};

const MOVE_COLS = `r.id, r.code, r.name, r.status, r.room, r.rooms, r.check_in::text AS check_in, r.check_out::text AS check_out,
  r.nights, r.adults, r.children, r.total, r.charge_total, r.amount_paid, r.desk_paid,
  to_char(r.paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS paid_at,
  COALESCE((SELECT ARRAY_AGG(h.number ORDER BY h.number) FROM room_assignments a JOIN hotel_rooms h ON h.id = a.room_id
            WHERE a.reservation_id = r.id), ARRAY[]::text[]) AS room_numbers`;

/**
 * Llegadas que aún no registran entrada y salidas pendientes de ese día.
 * Si es hoy, incluye también las llegadas atrasadas que siguen vigentes y las salidas vencidas.
 */
export async function dayMovements(day: string, isToday: boolean) {
  const [arrivals, departures] = await Promise.all([
    query<Movement>(
      `SELECT ${MOVE_COLS} FROM reservations r
       WHERE r.status IN ('por_pagar', 'confirmada')
         AND (r.check_in = $1::date OR ($2 AND r.check_in < $1::date AND r.check_out > $1::date))
       ORDER BY r.check_in, r.name`,
      [day, isToday],
    ),
    query<Movement>(
      `SELECT ${MOVE_COLS} FROM reservations r
       WHERE (r.status = 'hospedado' AND (r.check_out = $1::date OR ($2 AND r.check_out < $1::date)))
          OR (NOT $2 AND r.status = 'confirmada' AND r.check_out = $1::date)
       ORDER BY r.check_out, r.name`,
      [day, isToday],
    ),
  ]);
  return { arrivals, departures };
}
