import "server-only";
import Stripe from "stripe";
import { headers } from "next/headers";
import { getRoom, withPricing, type Pricing } from "@/data/rooms";
import { getPricing } from "./catalog";
import { getBooking } from "./settings";
import { fmtKey } from "./dates";
import { extendHold, markPaid, saveCheckoutSession, type Reservation } from "./reservations";

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

type Line = { name: string; unit: number; quantity: number };

const fmtDay = (k: string) => fmtKey(k, { weekday: "short", day: "numeric", month: "short" });

/**
 * Conceptos del recibo de Stripe: hospedaje por noche, persona adicional y desayunos, con los precios
 * vigentes. Si no suman exactamente lo que se cobra (anticipo, total editado a mano o precios que cambiaron
 * desde que se reservó), se usa un solo concepto con el detalle en el nombre.
 */
export function receiptLines(r: Reservation, pricing: Pricing): Line[] {
  const room = withPricing(pricing).find((x) => x.slug === r.room);
  const name = room?.name ?? getRoom(r.room)?.name ?? r.room;
  const stay = `${fmtDay(r.check_in)} al ${fmtDay(r.check_out)}`;
  const nightsLabel = `${r.nights} noche${r.nights !== 1 ? "s" : ""}`;
  const due = r.amount_due ?? 0;
  const summary = [
    `${name}${r.rooms > 1 ? ` x${r.rooms}` : ""} · ${stay} (${nightsLabel})`,
    `${r.adults} adulto${r.adults !== 1 ? "s" : ""}${r.children ? `, ${r.children} niño${r.children !== 1 ? "s" : ""}` : ""}`,
    r.breakfasts ? `${r.breakfasts} desayuno${r.breakfasts !== 1 ? "s" : ""} por día` : "",
  ].filter(Boolean).join(" · ");
  const single = (label: string): Line[] => [{ name: `${label} · Reservación ${r.code} · ${summary}`, unit: due, quantity: 1 }];

  const total = r.charge_total ?? r.total;
  if (!room) return single("Hospedaje");
  if (due < total) return single("Anticipo");

  const promo = r.promo_total != null && total === r.promo_total && r.promo_total < r.total;
  const guests = r.adults + r.children;
  const extraGuests = Math.max(0, guests - room.includedGuests * r.rooms);
  const lines: Line[] = [
    {
      name: `${name}${r.rooms > 1 ? ` (${r.rooms} habitaciones)` : ""} · ${stay}${promo ? " · tarifa promo pago anticipado" : ""}`,
      unit: promo ? room.promoPrice : room.price,
      quantity: r.nights * r.rooms,
    },
  ];
  if (extraGuests > 0) {
    lines.push({ name: `Persona adicional (${extraGuests} por noche)`, unit: pricing.extraPersonFee, quantity: extraGuests * r.nights });
  }
  if (r.breakfasts > 0) {
    lines.push({ name: `Desayuno (${r.breakfasts} por día)`, unit: pricing.breakfastPrice, quantity: r.breakfasts * r.nights });
  }
  const sum = lines.reduce((t, l) => t + l.unit * l.quantity, 0);
  return sum === due && lines.every((l) => l.unit > 0) ? lines : single("Hospedaje");
}

/** Resumen del recibo: folio, entrada y salida con horario. */
function receiptSummary(r: Reservation, times: { checkInTime: string; checkOutTime: string }) {
  const at = (t: string) => (t ? ` desde las ${t} h` : "");
  const until = (t: string) => (t ? ` antes de las ${t} h` : "");
  return `Hacienda del Indio ${r.code} · Entrada ${fmtDay(r.check_in)}${at(times.checkInTime)} · Salida ${fmtDay(r.check_out)}${until(times.checkOutTime)}`;
}

/** Crea la sesión de Checkout (o reutiliza la que siga abierta) y regresa su URL. */
export async function checkoutUrl(r: Reservation) {
  if (!r.pay_token || !r.amount_due) throw new Error("La reservación no tiene liga de pago.");
  const s = stripe();

  if (r.stripe_session_id) {
    const prev = await s.checkout.sessions.retrieve(r.stripe_session_id).catch(() => null);
    if (prev?.status === "open" && prev.url && prev.amount_total === r.amount_due * 100) return prev.url;
  }

  const base = await siteUrl();
  const [pricing, booking] = await Promise.all([getPricing(), getBooking()]);
  const lines = receiptLines(r, pricing);
  const summary = receiptSummary(r, booking);
  // Cliente con idioma español para que el recibo que envía Stripe por correo llegue en español
  const customer = await s.customers.create({
    name: r.name,
    phone: r.phone || undefined,
    preferred_locales: ["es-419", "es"],
    metadata: { reservation_id: String(r.id), code: r.code },
  });
  // Reserva automática: la sesión vence con el apartado (Stripe pide de 30 min a 24 h desde ahora)
  let expiresAt: number | undefined;
  if (r.hold_until) {
    const min = Date.now() + 31 * 60_000;
    const until = Math.min(Math.max(Date.parse(r.hold_until), min), Date.now() + 23.5 * 3_600_000);
    expiresAt = Math.floor(until / 1000);
    if (until > Date.parse(r.hold_until)) await extendHold(r.id, new Date(until).toISOString());
  }
  const session = await s.checkout.sessions.create({
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    mode: "payment",
    currency: "mxn",
    locale: "es",
    customer: customer.id,
    line_items: lines.map((l) => ({
      quantity: l.quantity,
      price_data: { currency: "mxn", unit_amount: l.unit * 100, product_data: { name: l.name } },
    })),
    custom_text: { submit: { message: summary } },
    client_reference_id: String(r.id),
    metadata: { reservation_id: String(r.id), code: r.code },
    payment_intent_data: { description: summary, metadata: { reservation_id: String(r.id), code: r.code } },
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
