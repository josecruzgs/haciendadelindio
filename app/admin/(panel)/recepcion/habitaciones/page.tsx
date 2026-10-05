import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listHotelRooms } from "@/lib/frontdesk";
import { rooms as roomTypes } from "@/data/rooms";
import { Card } from "@/components/admin/ui";
import { AddRoomsForm, RoomRow } from "./RoomForms";

export const metadata: Metadata = { title: "Habitaciones del hotel" };

export default async function HotelRoomsPage() {
  await requireAdmin();
  const all = await listHotelRooms({ includeInactive: true });

  return (
    <div className="space-y-5">
      <Link href="/admin/recepcion" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:text-rust">
        <ArrowLeft className="size-4" aria-hidden="true" /> Recepción
      </Link>
      <div>
        <h1 className="font-display text-4xl text-teal">Habitaciones del hotel</h1>
        <p className="max-w-2xl text-sm text-ink/65">
          Los números de habitación y su tipo. El tipo define a qué reservaciones se puede asignar cada una. Una habitación
          inactiva no aparece en recepción ni en el calendario (su historial se conserva).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_2.2fr]">
        <Card className="self-start">
          <h2 className="font-display text-2xl text-teal">Agregar</h2>
          <AddRoomsForm />
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-teal">
            {all.filter((r) => r.active).length} habitaciones activas
          </h2>
          {all.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Aún no hay habitaciones.</p>
          ) : (
            roomTypes.map((t) => {
              const list = all.filter((r) => r.type === t.slug);
              if (!list.length) return null;
              return (
                <div key={t.slug} className="mt-4">
                  <h3 className="text-xs font-bold tracking-wide text-ink/55 uppercase">
                    {t.name} ({list.filter((r) => r.active).length})
                  </h3>
                  <ul className="divide-y divide-black/5">
                    {list.map((r) => (
                      <RoomRow key={r.id} room={r} />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
