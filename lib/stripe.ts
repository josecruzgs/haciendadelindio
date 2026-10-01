import "server-only";
import Stripe from "stripe";
import { headers } from "next/headers";
import { getRoom } from "@/data/rooms";
import { markPaid, saveCheckoutSession, type Reservation } from "./reservations";

/**
 * Pagos con Stripe Checkout (página de pago alojada por Stripe).
 *   STRIPE_SECRET_KEY      sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET  whsec_… del endpoint /api/stripe/webhook
 *   SITE_URL               dominio público para armar las ligas (p. ej. https://www.haciendadelindiohotel.com)
 */

type Holder = { stripe?: Stripe; key?: string };
const g = globalThis as typeof globalThis & { __hdiStripe?: Holder };
const holder: Holder = (g.__hdiStripe ??= {});

const secretKey = () => process.env.STRIPE_SECRET_KEY?.trim() ?? "";

export const stripeEnabled = () => Boolean(secretKey());

/** Formato de la llave: sk_ (secreta) o rk_ (restringida), de prueba o real. */
export const stripeKeyLooksValid = () => /^(sk|rk)_(test|live)_/.test(secretKey());

export function stripe() {
  const key = secretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado.");
  // Si la llave cambia (p. ej. de real a prueba), crear un cliente nuevo
  if (!holder.stripe || holder.key !== key) {
    holder.stripe = new Stripe(key);
    holder.key = key;
  }
  return holder.stripe;
}

/** URL pública del sitio: SITE_URL o, si falta, el host de la petición actual. */
export async function siteUrl() {
  const env = process.env.SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const payUrl = (base: string, token: string) => `${base}/pagar/${token}`;

/** Crea la sesión de Checkout (o reutiliza la que siga abierta) y regresa su URL. */
export async function checkoutUrl(r: Reservation) {
  if (!r.pay_token || !r.amount_due) throw new Error("La reservación no tiene liga de pago.");
  const s = stripe();

  if (r.stripe_session_id) {
    const prev = await s.checkout.sessions.retrieve(r.stripe_session_id).catch(() => null);
    if (prev?.status === "open" && prev.url && prev.amount_total === r.amount_due * 100) return prev.url;
  }

  const base = await siteUrl();
  const room = getRoom(r.room);
  const session = await s.checkout.sessions.create({
    mode: "payment",
    currency: "mxn",
    locale: "es",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: r.amount_due * 100,
          product_data: {
            name: `Reservación ${r.code} · ${room?.name ?? r.room}${r.rooms > 1 ? ` x${r.rooms}` : ""}`,
            description: `Del ${r.check_in} al ${r.check_out} · ${r.nights} noche${r.nights !== 1 ? "s" : ""}${
              r.breakfasts ? ` · ${r.breakfasts} desayuno${r.breakfasts !== 1 ? "s" : ""} por día` : ""
            }`,
          },
        },
      },
    ],
    client_reference_id: String(r.id),
    metadata: { reservation_id: String(r.id), code: r.code },
    payment_intent_data: { description: `Hacienda del Indio ${r.code}`, metadata: { reservation_id: String(r.id), code: r.code } },
    success_url: `${payUrl(base, r.pay_token)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: payUrl(base, r.pay_token),
  });
  await saveCheckoutSession(r.id, session.id);
  if (!session.url) throw new Error("Stripe no regresó la URL de pago.");
  return session.url;
}

/** Registra el pago si la sesión está pagada y pertenece a la reservación. */
export async function settleSession(session: Stripe.Checkout.Session) {
  const id = Number.parseInt(session.metadata?.reservation_id ?? session.client_reference_id ?? "", 10);
  if (!Number.isFinite(id) || session.payment_status !== "paid") return false;
  const ref = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id);
  await markPaid(id, ref, session.amount_total != null ? Math.round(session.amount_total / 100) : null);
  return true;
}

/** Invalida la sesión de pago abierta (al cancelar) para que el huésped ya no pueda pagar. */
export async function expireOpenSession(r: Reservation) {
  if (!r.stripe_session_id || !stripeEnabled()) return;
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(r.stripe_session_id).catch(() => null);
  if (session?.status === "open") await s.checkout.sessions.expire(session.id);
}

/** Reembolso total o parcial (en pesos) del pago de la reservación. */
export async function refundPayment(r: Reservation, amount: number) {
  if (!r.payment_ref?.startsWith("pi_")) throw new Error("La reservación no tiene un pago de Stripe.");
  const refund = await stripe().refunds.create({
    payment_intent: r.payment_ref,
    amount: Math.round(amount * 100),
    reason: "requested_by_customer",
    metadata: { reservation_id: String(r.id), code: r.code },
  });
  return refund.id;
}

/** Liga al recibo oficial de Stripe del pago (o null si no hay cargo). */
export async function receiptUrl(paymentRef: string | null) {
  if (!paymentRef?.startsWith("pi_") || !stripeEnabled()) return null;
  const pi = await stripe().paymentIntents.retrieve(paymentRef, { expand: ["latest_charge"] });
  const charge = pi.latest_charge;
  return charge && typeof charge !== "string" ? charge.receipt_url : null;
}

/** Liga al pago en el Dashboard de Stripe (modo prueba o real según la llave). */
export const dashboardPaymentUrl = (paymentRef: string) =>
  `https://dashboard.stripe.com/${/_test_/.test(secretKey()) ? "test/" : ""}payments/${paymentRef}`;
