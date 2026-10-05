import { NextResponse } from "next/server";
import { todayKey } from "@/lib/dates";
import { blockedNights } from "@/lib/reservations";
import { autoBookingFor, fullNights } from "@/lib/availability";
import { sweepHolds } from "@/lib/holds";

export const dynamic = "force-dynamic";

/**
 * Noches sin disponibilidad por tipo de habitación (`all` aplica a todas): los bloqueos del panel y,
 * con la reserva automática activa, las noches en que ya no queda ninguna habitación de ese tipo.
 */
export async function GET() {
  try {
    const today = todayKey();
    await sweepHolds();
    const [blocked, auto] = await Promise.all([blockedNights(today), autoBookingFor()]);
    if (auto.on) {
      const full = await fullNights(today);
      for (const [type, nights] of Object.entries(full) as [keyof typeof full, string[]][]) {
        if (auto.inv[type] > 0) blocked[type] = [...new Set([...blocked[type], ...nights])].sort();
      }
    }
    return NextResponse.json(blocked, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
  } catch (e) {
    console.error("[disponibilidad]", e);
    return NextResponse.json({ all: [], sencilla: [], doble: [], triple: [] }, { status: 200 });
  }
}
