import { redirect } from "next/navigation";
import { getReservationByToken } from "@/lib/reservations";
import { receiptUrl } from "@/lib/stripe";

/** Recibo de pago para el huésped (con la misma liga privada de pago). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const r = await getReservationByToken((await params).token);
  const url = r?.paid_at ? await receiptUrl(r.payment_ref).catch(() => null) : null;
  if (!url) return new Response("Recibo no disponible.", { status: 404 });
  redirect(url);
}
