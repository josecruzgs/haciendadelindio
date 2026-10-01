import Link from "next/link";
import { BedDouble, CalendarArrowDown, CalendarArrowUp, Clock, CreditCard, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fmtKey, fmtKeyCap, todayKey } from "@/lib/dates";
import { dashboardStats, listReservations, upcomingArrivals } from "@/lib/reservations";
import { ago, Card, ChannelTag, guestsLabel, money, roomLabel, stayLabel, StatusBadge } from "@/components/admin/ui";
import StatusButtons from "./StatusButtons";

export default async function DashboardPage() {
  await requireAdmin();
  const today = todayKey();
  const [stats, pending, arrivals] = await Promise.all([
    dashboardStats(today),
    listReservations({ status: "pendiente", limit: 20 }),
    upcomingArrivals(today, 7),
  ]);

  const cards = [
    { label: "Solicitudes pendientes", value: stats.pending, icon: Clock, accent: "text-rust", href: "/admin/reservaciones?estado=pendiente" },
    { label: "Esperando pago", value: stats.awaiting_payment, icon: CreditCard, accent: "text-teal", href: "/admin/reservaciones?estado=por_pagar" },
    { label: "Llegadas hoy", value: stats.arrivals, icon: CalendarArrowDown, accent: "text-teal" },
    { label: "Salidas hoy", value: stats.departures, icon: CalendarArrowUp, accent: "text-teal" },
    { label: "Habitaciones ocupadas hoy", value: stats.in_house, icon: BedDouble, accent: "text-teal" },
    {
      label: `Ingresos estimados de ${fmtKey(today, { month: "long" })}`,
      value: money(stats.month_revenue),
      sub: `${stats.month_nights} noches-habitación confirmadas`,
      icon: Wallet,
      accent: "text-ink",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-teal">Resumen</h1>
          <p className="text-sm text-ink/65">{fmtKeyCap(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/admin/reservaciones/nueva" className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark">
          + Nueva reservación
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ label, value, sub, icon: Icon, accent, href }) => {
          const body = (
            <>
              <Icon className={`size-5 ${accent}`} aria-hidden="true" />
              <p className={`mt-2 font-heavy text-3xl font-black ${accent}`}>{value}</p>
              <p className="text-sm font-semibold text-ink/70">{label}</p>
              {sub && <p className="text-xs text-ink/55">{sub}</p>}
            </>
          );
          return href ? (
            <Link key={label} href={href} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-rust/40">
              {body}
            </Link>
          ) : (
            <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-display text-2xl text-teal">Por atender</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No hay solicitudes pendientes. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <Link href={`/admin/reservaciones/${r.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="font-bold text-ink">
                      {r.name} <span className="font-normal text-ink/50">· {r.code}</span> <ChannelTag channel={r.channel} />
                    </p>
                    <p className="text-sm text-ink/70">
                      {roomLabel(r)} · {stayLabel(r)} · {guestsLabel(r)} · <strong>{money(r.total)}</strong>
                    </p>
                    <p className="text-xs text-ink/50">Recibida {ago(r.created_at)}</p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/reservaciones/${r.id}`}
                      className="rounded-md bg-teal px-3 py-1 text-xs font-bold text-white hover:bg-teal-dark"
                    >
                      Revisar disponibilidad
                    </Link>
                    <StatusButtons id={r.id} status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-teal">Próximas llegadas (7 días)</h2>
          {arrivals.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Sin llegadas confirmadas en los próximos 7 días.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {arrivals.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reservaciones/${r.id}`} className="flex items-center gap-3 py-2.5 hover:bg-sand-light/60">
                    <span className="w-16 shrink-0 text-center">
                      <span className="block text-xs font-bold text-rust uppercase">
                        {r.check_in === today ? "Hoy" : fmtKey(r.check_in, { weekday: "short" })}
                      </span>
                      <span className="block font-heavy text-lg font-black text-ink">{fmtKey(r.check_in, { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{r.name}</span>
                      <span className="block text-sm text-ink/65">
                        {roomLabel(r)} · {r.nights} noche{r.nights !== 1 ? "s" : ""} · {guestsLabel(r)}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
