import { NextResponse } from "next/server";
import { todayKey } from "@/lib/dates";
import { blockedNights } from "@/lib/reservations";

export const dynamic = "force-dynamic";

/** Noches sin disponibilidad por tipo de habitación (`all` aplica a todas). */
export async function GET() {
  try {
    const blocked = await blockedNights(todayKey());
    return NextResponse.json(blocked, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("[disponibilidad]", e);
    return NextResponse.json({ all: [], sencilla: [], doble: [], triple: [] }, { status: 200 });
  }
}
