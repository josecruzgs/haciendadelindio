import { revalidatePath } from "next/cache";
import { syncRefunded } from "@/lib/reservations";
import { settleSession, stripe } from "@/lib/stripe";

/**
 * Webhook de Stripe. En el Dashboard de Stripe → Developers → Webhooks agrega
 *   https://<tu-dominio>/api/stripe/webhook
 * con los eventos checkout.session.completed, checkout.session.async_payment_succeeded y charge.refunded,
 * y copia el «Signing secret» en STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook no configurado", { status: 400 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    console.error("[stripe] firma de webhook inválida", e);
    return new Response("Firma inválida", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    try {
      if (await settleSession(event.data.object)) revalidatePath("/admin", "layout");
    } catch (e) {
      console.error("[stripe] no se pudo registrar el pago", e);
      return new Response("Error al registrar el pago", { status: 500 }); // Stripe reintenta
    }
  }
  // Reembolsos hechos directamente desde el Dashboard de Stripe
  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (pi) {
      await syncRefunded(pi, Math.round(charge.amount_refunded / 100));
      revalidatePath("/admin", "layout");
    }
  }
  return Response.json({ received: true });
}
