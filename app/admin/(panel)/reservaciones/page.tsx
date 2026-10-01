import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listReservations, STATUSES, type Status } from "@/lib/reservations";
import { ago, Card, ChannelTag, guestsLabel, money, roomLabel, stayLabel, StatusBadge, statusMeta } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reservaciones" };

type Search = { estado?: string; q?: string };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.estado ?? "") ? (sp.estado as Status) : "todas";
  const q = (sp.q ?? "").slice(0, 80);
  const rows = await listReservations({ status, q });

  const tabs: { key: Status | "todas"; label: string }[] = [
    { key: "todas", label: "Todas" },
    ...STATUSES.map((s) => ({ key: s, label: statusMeta[s].label })),
  ];
  const href = (estado: string) => {
    const p = new URLSearchParams();
    if (estado !== "todas") p.set("estado", estado);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/admin/reservaciones${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-teal">Reservaciones</h1>
        <Link href="/admin/reservaciones/nueva" className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark">
          + Nueva reservación
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5" aria-label="Filtrar por estado">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={status === t.key ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === t.key ? "bg-teal text-white" : "text-ink/75 hover:bg-sand-light"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full sm:w-72" action="/admin/reservaciones">
          {status !== "todas" && <input type="hidden" name="estado" value={status} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar nombre, teléfono o folio"
            className="w-full rounded-lg border-2 border-black/10 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-teal"
          />
        </form>
      </div>

      <Card className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-ink/60">No hay reservaciones con estos filtros.</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-sand-light text-xs tracking-wide text-ink/60 uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Folio</th>
                <th className="px-4 py-3 font-bold">Huésped</th>
                <th className="px-4 py-3 font-bold">Estancia</th>
                <th className="px-4 py-3 font-bold">Habitación</th>
                <th className="px-4 py-3 text-right font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Recibida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r) => (
                <tr key={r.id} className="relative hover:bg-sand-light/60">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/reservaciones/${r.id}`} className="font-bold text-teal after:absolute after:inset-0">
                      {r.code}
                    </Link>
                    <span className="mt-1 block">
                      <ChannelTag channel={r.channel} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-xs text-ink/60">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{stayLabel(r)}</p>
                    <p className="text-xs text-ink/60">
                      {r.nights} noche{r.nights !== 1 ? "s" : ""} · {guestsLabel(r)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {roomLabel(r)}
                    {r.breakfasts > 0 && (
                      <span className="ml-1 text-xs text-ink/55">
                        + {r.breakfasts} desayuno{r.breakfasts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{money(r.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">{ago(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-ink/50">{rows.length} resultado{rows.length !== 1 ? "s" : ""} (máximo 200 más recientes).</p>
    </div>
  );
}
