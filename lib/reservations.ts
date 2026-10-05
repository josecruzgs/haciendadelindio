import "server-only";
import { query } from "./db";
import { addDaysKey } from "./dates";
import type { Room } from "@/data/rooms";

/**
 * pendiente  → solicitud recibida, recepción revisa disponibilidad
 * por_pagar  → hay disponibilidad; se envió la liga de pago (Stripe) al huésped
 * confirmada → pagada (o confirmada manualmente por recepción)
 * hospedado  → registró su entrada en recepción (check-in)
 * completada → registró su salida (check-out)
 */
export const STATUSES = ["pendiente", "por_pagar", "confirmada", "hospedado", "completada", "cancelada"] as const;
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
  /** Desayunos por día (0 = sin desayuno). */
  breakfasts: number;
  total: number;
  promo_total: number | null;
  name: string;
  phone: string;
  notes: string | null;
  admin_notes: string | null;
  pay_token: string | null;
  amount_due: number | null;
  stripe_session_id: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  /** Total acordado al enviar la liga (con promo si aplica). */
  charge_total: number | null;
  amount_paid: number | null;
  refunded_amount: number;
  refund_ref: string | null;
  cancelled_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  /** Suma de los pagos registrados en recepción. */
  desk_paid: number;
  guest_email: string | null;
  /** Identificación (INE, pasaporte…). */
  guest_id: string | null;
  /** Procedencia. */
  guest_city: string | null;
  /** Vehículo / placas. */
  vehicle: string | null;
  /** Reserva automática: la habitación queda apartada hasta esta hora mientras el huésped paga. */
  hold_until: string | null;
  /** Se canceló sola porque venció el apartado sin pago. */
  expired_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Block = { id: number; room: Room["slug"] | null; start_date: string; end_date: string; reason: string | null };

// Las fechas se leen como texto para evitar corrimientos de zona horaria.
const COLS = `id, code, status, source, channel, room, rooms, adults, children,
  check_in::text AS check_in, check_out::text AS check_out, nights, breakfast, breakfasts, total, promo_total,
  name, phone, notes, admin_notes, pay_token, amount_due, stripe_session_id, payment_ref,
  to_char(paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS paid_at,
  charge_total, amount_paid, refunded_amount, refund_ref,
  to_char(cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cancelled_at,
  to_char(checked_in_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checked_in_at,
  to_char(checked_out_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checked_out_at,
  desk_paid, guest_email, guest_id, guest_city, vehicle,
  to_char(hold_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS hold_until,
  to_char(expired_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS expired_at, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`;

type PaymentCols = "pay_token" | "amount_due" | "stripe_session_id" | "payment_ref" | "paid_at" | "charge_total"
  | "amount_paid" | "refunded_amount" | "refund_ref" | "cancelled_at";
type FrontDeskCols = "checked_in_at" | "checked_out_at" | "desk_paid" | "guest_email" | "guest_id" | "guest_city" | "vehicle"
  | "hold_until" | "expired_at";
export type NewReservation = Omit<Reservation, "id" | "code" | "created_at" | "updated_at" | "admin_notes" | "breakfast" | PaymentCols | FrontDeskCols> & {
  admin_notes?: string | null;
};

export async function insertReservation(r: NewReservation) {
  const [row] = await query<{ id: number }>(
    `INSERT INTO reservations (status, source, channel, room, rooms, adults, children, check_in, check_out, nights,
       breakfast, breakfasts, total, promo_total, name, phone, notes, admin_notes)
     VALUES ($1,$2,$17,$3,$4,$5,$6,$7,$8,$9,$10,$18,$11,$12,$13,$14,$15,$16) RETURNING id`,
    [r.status, r.source, r.room, r.rooms, r.adults, r.children, r.check_in, r.check_out, r.nights,
     r.breakfasts > 0, r.total, r.promo_total, r.name, r.phone, r.notes, r.admin_notes ?? null, r.channel, r.breakfasts],
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

export async function getReservationByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await query<Reservation>(`SELECT ${COLS} FROM reservations WHERE pay_token = $1`, [token]);
  return row ?? null;
}

/* ---------- Pago en línea ---------- */

/** Saldo que queda por pagar en recepción (descontando lo pagado en línea y en recepción). */
export const balanceDue = (r: Pick<Reservation, "total" | "charge_total" | "amount_paid" | "desk_paid">) =>
  Math.max(0, (r.charge_total ?? r.total) - (r.amount_paid ?? 0) - (r.desk_paid ?? 0));

/** Lo que aún se puede reembolsar por Stripe. */
export const refundable = (r: Pick<Reservation, "amount_paid" | "refunded_amount" | "payment_ref">) =>
  r.payment_ref?.startsWith("pi_") ? Math.max(0, (r.amount_paid ?? 0) - r.refunded_amount) : 0;

/** Pasa la reservación a «por_pagar» con los montos dados y genera (o reutiliza) su liga de pago. */
export async function requestPayment(id: number, token: string, amounts: { total: number; due: number }) {
  const [row] = await query<{ pay_token: string }>(
    `UPDATE reservations
     SET status = 'por_pagar', pay_token = COALESCE(pay_token, $2),
         charge_total = $3, amount_due = $4, updated_at = NOW()
     WHERE id = $1 AND status IN ('pendiente', 'por_pagar') AND paid_at IS NULL RETURNING pay_token`,
    [id, token, amounts.total, amounts.due],
  );
  return row?.pay_token ?? null;
}

export async function saveCheckoutSession(id: number, sessionId: string) {
  await query(`UPDATE reservations SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`, [sessionId, id]);
}

/**
 * Registra el pago y confirma la reservación. Idempotente (el webhook y la página de éxito pueden llegar ambos).
 * Si recepción la canceló mientras el huésped pagaba, se registra el pago pero no cambia el estado (reembolsar en Stripe).
 * Si se canceló sola por vencer el apartado justo mientras pagaba, se reactiva y se deja una nota para revisar.
 */
export async function markPaid(id: number, paymentRef: string | null, amount: number | null) {
  const rows = await query<{ id: number }>(
    `UPDATE reservations
     SET paid_at = NOW(), payment_ref = $2, amount_paid = COALESCE($3, amount_due), updated_at = NOW(),
         admin_notes = CASE WHEN status = 'cancelada' AND expired_at IS NOT NULL
           THEN CONCAT_WS(E'\n', admin_notes, 'Pagó después de vencer el apartado: se reactivó. Revisa la disponibilidad.')
           ELSE admin_notes END,
         status = CASE WHEN status IN ('pendiente', 'por_pagar') OR (status = 'cancelada' AND expired_at IS NOT NULL)
           THEN 'confirmada' ELSE status END,
         cancelled_at = CASE WHEN status = 'cancelada' AND expired_at IS NOT NULL THEN NULL ELSE cancelled_at END,
         hold_until = NULL
     WHERE id = $1 AND paid_at IS NULL RETURNING id`,
    [id, paymentRef, amount],
  );
  return rows.length > 0;
}

/* ---------- Reserva automática ---------- */

/** Minutos de gracia después del apartado para que un pago en curso alcance a registrarse. */
export const HOLD_GRACE_MIN = 10;

/** Deja la reservación lista para pagar en línea, con la habitación apartada hasta `holdUntil`. */
export async function startHold(id: number, token: string, amounts: { total: number; due: number }, holdMinutes: number) {
  const [row] = await query<{ pay_token: string }>(
    `UPDATE reservations
     SET status = 'por_pagar', pay_token = $2, charge_total = $3, amount_due = $4,
         hold_until = NOW() + ($5 || ' minutes')::interval, updated_at = NOW()
     WHERE id = $1 RETURNING pay_token`,
    [id, token, amounts.total, amounts.due, String(holdMinutes)],
  );
  return row?.pay_token ?? null;
}

/** Alarga el apartado (Stripe pide que la sesión de pago dure al menos 30 minutos). */
export async function extendHold(id: number, untilIso: string) {
  await query(`UPDATE reservations SET hold_until = GREATEST(hold_until, $2::timestamptz) WHERE id = $1 AND hold_until IS NOT NULL`, [id, untilIso]);
}

/** Cancela las reservaciones automáticas que no se pagaron a tiempo y libera sus habitaciones. */
export async function expireHolds() {
  const rows = await query<Reservation>(
    `UPDATE reservations
     SET status = 'cancelada', cancelled_at = NOW(), expired_at = NOW(), updated_at = NOW(),
         admin_notes = CONCAT_WS(E'\n', admin_notes, 'Apartado vencido: no se recibió el pago a tiempo.')
     WHERE status = 'por_pagar' AND paid_at IS NULL AND hold_until IS NOT NULL
       AND hold_until < NOW() - INTERVAL '${HOLD_GRACE_MIN} minutes'
     RETURNING ${COLS}`,
  );
  if (rows.length) {
    await query(`DELETE FROM room_assignments WHERE reservation_id = ANY($1::int[])`, [rows.map((r) => r.id)]);
  }
  return rows;
}

/** Borra una reservación recién creada que perdió la carrera por la última habitación. */
export async function deleteReservation(id: number) {
  await query(`DELETE FROM reservations WHERE id = $1`, [id]);
}


/** Cancela la reservación (solo cuando el huésped lo pide) y registra el reembolso si lo hubo. */
export async function markCancelled(id: number, refund?: { amount: number; ref: string }) {
  await query(
    `UPDATE reservations
     SET status = 'cancelada', cancelled_at = NOW(), updated_at = NOW(),
         refunded_amount = refunded_amount + $2, refund_ref = COALESCE($3, refund_ref)
     WHERE id = $1`,
    [id, refund?.amount ?? 0, refund?.ref ?? null],
  );
}

export async function addRefund(id: number, amount: number, ref: string) {
  await query(
    `UPDATE reservations SET refunded_amount = refunded_amount + $2, refund_ref = $3, updated_at = NOW() WHERE id = $1`,
    [id, amount, ref],
  );
}

/** Sincroniza reembolsos hechos directo en el Dashboard de Stripe (webhook charge.refunded). */
export async function syncRefunded(paymentIntent: string, refundedTotal: number) {
  await query(
    `UPDATE reservations SET refunded_amount = GREATEST(refunded_amount, $2), updated_at = NOW() WHERE payment_ref = $1`,
    [paymentIntent, refundedTotal],
  );
}

export async function listReservations(opts: { status?: Status | "todas" | "pagada"; q?: string; limit?: number } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status === "pagada") {
    // Pagaron (en línea o en recepción, total o anticipo) y siguen activas o ya se hospedaron
    where.push(`(paid_at IS NOT NULL OR desk_paid > 0) AND status IN ('confirmada', 'hospedado', 'completada')`);
  } else if (opts.status && opts.status !== "todas") {
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
    pending: number; awaiting_payment: number; arrivals: number; departures: number; in_house: number; month_revenue: number; month_nights: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pendiente')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'por_pagar')::int AS awaiting_payment,
       COUNT(*) FILTER (WHERE status IN ('confirmada','hospedado') AND check_in = $1::date)::int AS arrivals,
       COUNT(*) FILTER (WHERE status IN ('confirmada','hospedado','completada') AND check_out = $1::date)::int AS departures,
       COALESCE(SUM(rooms) FILTER (WHERE (status = 'hospedado' OR (status = 'confirmada' AND check_in <= $1::date AND check_out > $1::date))), 0)::int AS in_house,
       COALESCE(SUM(total) FILTER (WHERE status IN ('confirmada','hospedado','completada') AND check_in >= $2::date AND check_in < ($2::date + INTERVAL '1 month')), 0)::int AS month_revenue,
       COALESCE(SUM(nights * rooms) FILTER (WHERE status IN ('confirmada','hospedado','completada') AND check_in >= $2::date AND check_in < ($2::date + INTERVAL '1 month')), 0)::int AS month_nights
     FROM reservations`,
    [today, monthStart],
  );
  return row;
}

export async function upcomingArrivals(today: string, days = 7) {
  return query<Reservation>(
    `SELECT ${COLS} FROM reservations
     WHERE status IN ('confirmada', 'hospedado') AND check_in >= $1::date AND check_in <= $2::date
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
