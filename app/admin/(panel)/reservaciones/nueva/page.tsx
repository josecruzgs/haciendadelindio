import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getPricing } from "@/lib/catalog";
import { addDaysKey, todayKey } from "@/lib/dates";
import { Card } from "@/components/admin/ui";
import NewReservationForm from "./NewReservationForm";

export const metadata: Metadata = { title: "Nueva reservación" };

export default async function NewReservationPage() {
  await requireAdmin();
  const today = todayKey();
  const pricing = await getPricing();
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-4xl text-teal">Nueva reservación</h1>
        <p className="text-sm text-ink/65">Para reservaciones tomadas por teléfono, WhatsApp o en recepción.</p>
      </div>
      <Card>
        <NewReservationForm today={today} tomorrow={addDaysKey(today, 1)} pricing={pricing} />
      </Card>
    </div>
  );
}
