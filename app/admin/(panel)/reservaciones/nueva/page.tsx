import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getPricing } from "@/lib/catalog";
import { addDaysKey, todayKey } from "@/lib/dates";
import { listHotelRooms, upcomingAssignments } from "@/lib/frontdesk";
import { Card } from "@/components/admin/ui";
import NewReservationForm from "./NewReservationForm";

export const metadata: Metadata = { title: "Nueva reservación" };

export default async function NewReservationPage({ searchParams }: { searchParams: Promise<{ walkin?: string; habitacion?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayKey();
  const [pricing, hotelRooms, busy] = await Promise.all([getPricing(), listHotelRooms(), upcomingAssignments(today)]);
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-4xl text-teal">Nueva reservación</h1>
        <p className="text-sm text-ink/65">
          Para reservaciones tomadas por teléfono, WhatsApp o en recepción, y para huéspedes que llegan sin reservación.
        </p>
      </div>
      <Card>
        <NewReservationForm
          today={today}
          tomorrow={addDaysKey(today, 1)}
          pricing={pricing}
          hotelRooms={hotelRooms.map(({ id, number, type, housekeeping }) => ({ id, number, type, housekeeping }))}
          busy={busy}
          walkIn={sp.walkin === "1"}
          roomId={Number(sp.habitacion) || null}
        />
      </Card>
    </div>
  );
}
