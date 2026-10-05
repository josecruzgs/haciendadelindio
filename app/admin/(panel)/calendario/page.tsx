import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { addDaysKey, fmtKey, fmtKeyCap, nightsBetweenKeys, todayKey } from "@/lib/dates";
import { listHotelRooms, staysInRange, type Stay } from "@/lib/frontdesk";
import type { Status } from "@/lib/reservations";
import { rooms as roomTypes } from "@/data/rooms";
import { Card, statusMeta } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Calendario" };

const barCls: Partial<Record<Status, string>> = {
  pendiente: "bg-orange/80 text-teal-dark",
  por_pagar: "bg-white text-teal ring-1 ring-inset ring-teal",
  confirmada: "bg-teal-light text-teal ring-1 ring-inset ring-teal/40",
  hospedado: "bg-teal-dark text-white",
  completada: "bg-ink/20 text-ink/80",
};

const monthKey = (k: string) => k.slice(0, 7);
const shiftMonth = (ym: string, n: number) => {
  const d = new Date(`${ym}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

/** Reparte estancias en carriles sin que se encimen (para las reservaciones sin habitación asignada). */
function lanes(stays: Stay[]) {
  const out: Stay[][] = [];
  for (const s of [...stays].sort((a, b) => a.check_in.localeCompare(b.check_in))) {
    const lane = out.find((l) => l[l.length - 1].check_out <= s.check_in);
    if (lane) lane.push(s);
    else out.push([s]);
  }
  return out;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireAdmin();
  const today = todayKey();
  const sp = await searchParams;
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes ?? "") ? sp.mes! : monthKey(today);
  const first = `${ym}-01`;
  const next = `${shiftMonth(ym, 1)}-01`;
  const days = Array.from({ length: nightsBetweenKeys(first, next) }, (_, i) => addDaysKey(first, i));

  const [hotelRooms, { assigned, unassigned }] = await Promise.all([listHotelRooms(), staysInRange(first, next)]);
  const cols = `7.5rem repeat(${days.length}, minmax(2.1rem, 1fr))`;
  const col = (k: string) => nightsBetweenKeys(first, k) + 2;

  // Ocupación por noche: habitaciones con alguien + reservaciones aún sin habitación
  const covers = (s: Stay, d: string) => s.check_in <= d && s.check_out > d;
  const occupancy = days.map((d) => {
    const busy = new Set(assigned.filter((s) => covers(s, d)).map((s) => s.room_id)).size;
    return busy + unassigned.filter((s) => covers(s, d)).length;
  });

  const Bars = ({ stays }: { stays: Stay[] }) =>
    stays.map((s, i) => {
      const start = s.check_in < first ? first : s.check_in;
      const end = s.check_out > next ? next : s.check_out;
      return (
        <Link
          key={`${s.reservation_id}-${i}`}
          href={`/admin/reservaciones/${s.reservation_id}`}
          title={`${s.name} · ${s.code} · ${statusMeta[s.status].label}\n${fmtKey(s.check_in)} → ${fmtKey(s.departure)}`}
          style={{ gridRow: 1, gridColumn: `${col(start)} / ${col(end)}` }}
          className={`z-10 mx-px my-1 flex min-w-0 items-center truncate rounded-md px-1.5 text-[11px] leading-tight font-bold hover:brightness-95 ${
            barCls[s.status] ?? "bg-ink/10"
          } ${s.check_in < first ? "rounded-l-none" : ""} ${s.check_out > next ? "rounded-r-none" : ""}`}
        >
          <span className="truncate">{s.name}</span>
        </Link>
      );
    });

  const Row = ({ label, sub, stays, warn }: { label: React.ReactNode; sub?: string; stays: Stay[]; warn?: boolean }) => (
    <div className="grid min-h-9 border-t border-black/5" style={{ gridTemplateColumns: cols }}>
      <div
        style={{ gridRow: 1, gridColumn: 1 }}
        className={`sticky left-0 z-20 flex flex-col justify-center border-r border-black/10 bg-white px-2 ${warn ? "text-rust" : ""}`}
      >
        <span className="text-sm font-bold">{label}</span>
        {sub && <span className="text-[10px] leading-tight text-ink/50">{sub}</span>}
      </div>
      {days.map((d, i) => (
        <div
          key={d}
          style={{ gridRow: 1, gridColumn: i + 2 }}
          className={`border-r border-black/5 ${d === today ? "bg-rust/10" : [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()) ? "bg-sand-light/60" : ""}`}
        />
      ))}
      <Bars stays={stays} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-teal">Calendario</h1>
          <p className="text-sm text-ink/65">Ocupación por habitación. Toca un día para ver su detalle en Recepción.</p>
        </div>
        <nav className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5" aria-label="Cambiar mes">
          <Link href={`/admin/calendario?mes=${shiftMonth(ym, -1)}`} className="rounded-md p-1.5 text-teal hover:bg-sand-light" aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-36 px-2 text-center text-sm font-bold text-teal">{fmtKeyCap(first, { month: "long", year: "numeric" })}</span>
          <Link href={`/admin/calendario?mes=${shiftMonth(ym, 1)}`} className="rounded-md p-1.5 text-teal hover:bg-sand-light" aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </Link>
          {ym !== monthKey(today) && (
            <Link href="/admin/calendario" className="rounded-md px-2 py-1 text-sm font-semibold text-teal hover:bg-sand-light">
              Hoy
            </Link>
          )}
        </nav>
      </div>

      {hotelRooms.length === 0 ? (
        <Card className="max-w-2xl">
          <p className="text-sm text-ink/70">Agrega las habitaciones del hotel para ver el calendario de ocupación.</p>
          <Link href="/admin/recepcion/habitaciones" className="mt-3 inline-flex rounded-md bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-dark">
            Agregar habitaciones
          </Link>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[1050px]">
            <div className="sticky top-0 z-30 grid bg-sand-light" style={{ gridTemplateColumns: cols }}>
              <div className="sticky left-0 z-20 border-r border-black/10 bg-sand-light px-2 py-2 text-xs font-bold text-ink/60 uppercase">
                Habitación
              </div>
              {days.map((d) => (
                  <Link
                    key={d}
                    href={`/admin/recepcion?fecha=${d}`}
                    className={`border-r border-black/5 py-1 text-center leading-tight hover:bg-white ${d === today ? "bg-rust text-white hover:text-rust" : ""}`}
                  >
                    <span className="block text-[10px] font-semibold uppercase opacity-70">{fmtKey(d, { weekday: "narrow" })}</span>
                    <span className="block text-sm font-bold">{Number(d.slice(8))}</span>
                  </Link>
              ))}
            </div>

            {roomTypes.map((t) => {
              const group = hotelRooms.filter((r) => r.type === t.slug);
              const pending = lanes(unassigned.filter((s) => s.room_type === t.slug));
              if (!group.length && !pending.length) return null;
              return (
                <div key={t.slug}>
                  <div className="sticky left-0 border-t border-black/10 bg-teal-light/60 px-2 py-1 text-xs font-bold tracking-wide text-teal uppercase">
                    {t.name}
                  </div>
                  {group.map((r) => (
                    <Row
                      key={r.id}
                      label={r.number}
                      sub={r.housekeeping === "mantenimiento" ? "Mantenimiento" : undefined}
                      warn={r.housekeeping === "mantenimiento"}
                      stays={assigned.filter((s) => s.room_id === r.id)}
                    />
                  ))}
                  {pending.map((l, i) => (
                    <Row key={`p${i}`} label="Sin asignar" sub={t.cardName} warn stays={l} />
                  ))}
                </div>
              );
            })}

            <div className="grid border-t-2 border-black/10 bg-sand-light/70" style={{ gridTemplateColumns: cols }}>
              <div className="sticky left-0 z-20 border-r border-black/10 bg-sand-light px-2 py-1.5 text-xs font-bold text-ink/60">
                Ocupadas / {hotelRooms.length}
              </div>
              {occupancy.map((n, i) => (
                <div
                  key={days[i]}
                  className={`border-r border-black/5 py-1.5 text-center text-xs font-bold ${n > hotelRooms.length ? "text-rust" : n === hotelRooms.length ? "text-teal" : "text-ink/60"}`}
                  title={`${n} de ${hotelRooms.length} habitaciones`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-ink/65">
        {(Object.keys(barCls) as Status[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-6 rounded ${barCls[s]}`} /> {statusMeta[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-rust/10" /> Hoy
        </span>
      </div>
    </div>
  );
}
