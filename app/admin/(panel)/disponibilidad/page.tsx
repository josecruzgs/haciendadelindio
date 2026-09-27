import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { fmtKeyCap, nightsBetweenKeys, todayKey } from "@/lib/dates";
import { listBlocks } from "@/lib/reservations";
import { getRoom } from "@/data/rooms";
import { Card } from "@/components/admin/ui";
import BlockForm, { RemoveBlockButton } from "./BlockForm";

export const metadata: Metadata = { title: "Disponibilidad" };

export default async function AvailabilityPage() {
  await requireAdmin();
  const today = todayKey();
  const blocks = await listBlocks(today);
  const fmt = (k: string) => fmtKeyCap(k, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl text-teal">Disponibilidad</h1>
        <p className="max-w-2xl text-sm text-ink/65">
          Bloquea las noches en que ya no hay habitaciones disponibles. En el calendario del sitio aparecen tachadas y no se
          pueden solicitar.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="font-display text-2xl text-teal">Bloquear fechas</h2>
          <BlockForm today={today} />
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-teal">Bloqueos activos</h2>
          {blocks.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No hay fechas bloqueadas. Todo el calendario está abierto.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {blocks.map((b) => {
                const n = nightsBetweenKeys(b.start_date, b.end_date) + 1;
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {b.start_date === b.end_date ? fmt(b.start_date) : `${fmt(b.start_date)} → ${fmt(b.end_date)}`}
                        <span className="ml-2 text-xs font-normal text-ink/50">
                          {n} noche{n !== 1 ? "s" : ""}
                        </span>
                      </p>
                      <p className="text-sm text-ink/65">
                        {b.room ? getRoom(b.room)?.name : "Todas las habitaciones"}
                        {b.reason ? ` · ${b.reason}` : ""}
                      </p>
                    </div>
                    <RemoveBlockButton id={b.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
