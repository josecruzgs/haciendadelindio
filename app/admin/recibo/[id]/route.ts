import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getReservation } from "@/lib/reservations";
import { receiptUrl } from "@/lib/stripe";

/** Abre el recibo de Stripe de una reservación (solo administradores). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const r = await getReservation(Number.parseInt((await params).id, 10));
  const url = r ? await receiptUrl(r.payment_ref).catch(() => null) : null;
  if (!url) return new Response("No se encontró el recibo de Stripe para esta reservación.", { status: 404 });
  redirect(url);
}
