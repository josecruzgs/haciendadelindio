import { requireAdmin } from "@/lib/auth";
import { isDateKey } from "@/lib/dates";
import { query } from "@/lib/db";

/**
 * Respaldo CSV de reservaciones (se abre bien en Excel).
 *   /admin/exportar                → todas
 *   /admin/exportar?antes=AAAA-MM-DD → solo las que salieron antes de esa fecha (las que borraría la limpieza)
 */
export async function GET(req: Request) {
  await requireAdmin();
  const antes = new URL(req.url).searchParams.get("antes");
  const filter = antes && isDateKey(antes);
  const rows = await query<Record<string, unknown>>(
    `SELECT code AS folio, status AS estado, channel AS canal, room AS habitacion, rooms AS habitaciones,
            adults AS adultos, children AS ninos, check_in::text AS entrada, check_out::text AS salida, nights AS noches,
            breakfasts AS desayunos_por_dia, total, promo_total AS total_promo, charge_total AS total_acordado,
            amount_paid AS pagado, refunded_amount AS reembolsado, payment_ref AS pago_stripe, desk_paid AS pagado_recepcion,
            (SELECT STRING_AGG(h.number, ' ' ORDER BY h.number) FROM room_assignments a JOIN hotel_rooms h ON h.id = a.room_id
             WHERE a.reservation_id = reservations.id) AS num_habitacion,
            to_char(checked_in_at AT TIME ZONE 'America/Tijuana', 'YYYY-MM-DD HH24:MI') AS registro_entrada,
            to_char(checked_out_at AT TIME ZONE 'America/Tijuana', 'YYYY-MM-DD HH24:MI') AS registro_salida,
            name AS nombre, phone AS telefono, guest_email AS correo, guest_id AS identificacion, guest_city AS procedencia,
            vehicle AS vehiculo, notes AS comentarios, admin_notes AS notas_internas,
            to_char(created_at AT TIME ZONE 'America/Tijuana', 'YYYY-MM-DD HH24:MI') AS creada
     FROM reservations ${filter ? "WHERE check_out < $1::date" : ""} ORDER BY check_in`,
    filter ? [antes] : [],
  );
  const cols = [
    "folio", "estado", "canal", "habitacion", "habitaciones", "adultos", "ninos", "entrada", "salida", "noches",
    "desayunos_por_dia", "total", "total_promo", "total_acordado", "pagado", "reembolsado", "pago_stripe", "pagado_recepcion",
    "num_habitacion", "registro_entrada", "registro_salida", "nombre", "telefono", "correo", "identificacion", "procedencia",
    "vehiculo", "comentarios", "notas_internas", "creada",
  ];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Evita que Excel interprete el texto como fórmula
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  // "+52 686…" se escribe "(+52) 686…" para que Excel no lo tome como fórmula
  const phone = (v: unknown) => String(v ?? "").replace(/^\+(\d+)\s/, "(+$1) ");
  const csv =
    "﻿" +
    [cols.join(","), ...rows.map((r) => cols.map((c) => cell(c === "telefono" ? phone(r[c]) : r[c])).join(","))].join("\r\n");
  const name = `reservaciones${filter ? `-antes-de-${antes}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
