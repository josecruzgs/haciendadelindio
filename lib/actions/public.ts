"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimited } from "../auth";
import { isDateKey, nightsBetweenKeys, todayKey } from "../dates";
import { quote, roomBySlug } from "../pricing";
import { getReservationByToken, insertReservation, isRangeBlocked } from "../reservations";
import { checkoutUrl, stripeEnabled } from "../stripe";

export type BookingInput = {
  /** "directa" = botón Reservar ahora; "whatsapp" = también abre WhatsApp. */
  channel: "directa" | "whatsapp";
  room: string;
  rooms: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  /** Desayunos por día: de 0 al número de huéspedes. */
  breakfasts: number;
  name: string;
  phone: string;
  notes: string;
  /** Campo trampa anti-spam: debe venir vacío. */
  website?: string;
};

export type BookingResult =
  | { ok: true; code: string; total: number; promoTotal: number | null }
  | { ok: false; error: string; retryable?: boolean };

const MAX_NIGHTS = 60;
const MAX_ROOMS = 10;
const int = (v: unknown) => (Number.isInteger(v) ? (v as number) : NaN);

export async function createReservation(input: BookingInput): Promise<BookingResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`booking:${ip}`, 8, 60 * 60_000)) {
    return { ok: false, error: "Recibimos varias solicitudes seguidas. Intenta de nuevo más tarde o llámanos." };
  }
  if (input.website) return { ok: true, code: "HDI-00000", total: 0, promoTotal: null }; // bot

  const room = roomBySlug(input.room);
  const rooms = int(input.rooms);
  const adults = int(input.adults);
  const children = int(input.children);
  const name = String(input.name ?? "").trim().slice(0, 120);
  const phone = String(input.phone ?? "").trim().slice(0, 30);
  const notes = String(input.notes ?? "").trim().slice(0, 1000);

  if (!room) return { ok: false, error: "Habitación no válida." };
  if (!isDateKey(input.checkIn) || !isDateKey(input.checkOut)) return { ok: false, error: "Fechas no válidas." };
  const nights = nightsBetweenKeys(input.checkIn, input.checkOut);
  if (input.checkIn < todayKey()) return { ok: false, error: "La fecha de entrada ya pasó." };
  if (nights < 1 || nights > MAX_NIGHTS) return { ok: false, error: `La estancia debe ser de 1 a ${MAX_NIGHTS} noches.` };
  if (!(rooms >= 1 && rooms <= MAX_ROOMS)) return { ok: false, error: "Número de habitaciones no válido." };
  if (!(adults >= rooms) || !(children >= 0) || adults + children > room.maxGuests * rooms) {
    return { ok: false, error: "El número de huéspedes excede la capacidad." };
  }
  if (name.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (phone.replace(/\D/g, "").length < 10) return { ok: false, error: "Escribe un teléfono a 10 dígitos." };

  try {
    if (await isRangeBlocked(room.slug, input.checkIn, input.checkOut)) {
      return { ok: false, error: "Algunas de esas noches ya no tienen disponibilidad para esta habitación. Elige otras fechas." };
    }
    const q = quote(room, { nights, roomCount: rooms, guests: adults + children, breakfasts: int(input.breakfasts) || 0 });
    const { code } = await insertReservation({
      status: "pendiente",
      source: "web",
      channel: input.channel === "directa" ? "directa" : "whatsapp",
      room: room.slug,
      rooms,
      adults,
      children,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights,
      breakfasts: q.breakfasts,
      total: q.total,
      promo_total: q.promoEligible ? q.promoTotal : null,
      name,
      phone,
      notes: notes || null,
    });
    return { ok: true, code, total: q.total, promoTotal: q.promoEligible ? q.promoTotal : null };
  } catch (e) {
    console.error("[reservas] no se pudo guardar la solicitud", e);
    return { ok: false, error: "No pudimos registrar la solicitud.", retryable: true };
  }
}

/* ---------- Pago en línea ---------- */

export type PayState = { error?: string } | undefined;

/** Botón «Pagar» de /pagar/<token>: crea la sesión de Stripe Checkout y redirige a ella. */
export async function startPayment(token: string, _: PayState): Promise<PayState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`pay:${ip}`, 20, 60 * 60_000)) return { error: "Demasiados intentos. Intenta más tarde." };

  const r = await getReservationByToken(token);
  if (!r || r.paid_at) return { error: "Esta liga de pago ya no está disponible." };
  if (r.status !== "por_pagar") return { error: "Esta reservación no tiene un pago pendiente." };
  if (!stripeEnabled()) return { error: "El pago en línea no está disponible por el momento. Contáctanos por WhatsApp." };

  let url: string;
  try {
    url = await checkoutUrl(r);
  } catch (e) {
    console.error("[stripe] no se pudo crear la sesión de pago", e);
    return { error: "No pudimos abrir la página de pago. Intenta de nuevo en unos minutos." };
  }
  redirect(url);
}
