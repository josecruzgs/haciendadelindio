"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { checkCredentials, createSession, destroySession, rateLimited, requireAdmin } from "../auth";
import { isDateKey, nightsBetweenKeys } from "../dates";
import { quote, roomBySlug } from "../pricing";
import { getPricedRoom, getPricing, savePricing } from "../catalog";
import { normalizePhone, type PhoneCountry } from "@/data/phone";
import { DEFAULT_PRICING, mxn, type Pricing } from "@/data/rooms";
import { whatsappTo } from "@/data/site";
import { computeCharge, getSettings, saveSetting, STRIPE_MIN_MXN, type AdvanceSettings } from "../settings";
import { expireOpenSession, payUrl, refundPayment, siteUrl, stripeEnabled } from "../stripe";
import { renderTemplate, reservationVars, type Template } from "../templates";
import {
  deleteBlock,
  getReservation,
  insertBlock,
  insertReservation,
  markCancelled,
  addRefund,
  refundable,
  requestPayment,
  STATUSES,
  updateReservation,
  type Status,
} from "../reservations";

export type FormState = { error?: string; ok?: string; user?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number.parseInt(str(fd, k), 10);

/* ---------- Sesión ---------- */

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`login:${ip}`, 5, 15 * 60_000)) {
    return { error: "Demasiados intentos. Espera 15 minutos e intenta de nuevo.", user: str(fd, "user") };
  }
  const user = str(fd, "user");
  if (!checkCredentials(user, String(fd.get("password") ?? ""))) {
    return { error: "Usuario o contraseña incorrectos.", user };
  }
  await createSession(user);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Reservaciones ---------- */

export async function setStatus(id: number, status: Status) {
  await requireAdmin();
  // Cancelar va por cancelReservation (invalida la liga y permite reembolsar)
  if (!STATUSES.includes(status) || status === "cancelada") return;
  await updateReservation(id, { status });
  revalidatePath("/admin", "layout");
}

export type PaymentLinkResult = { ok: true; payUrl: string; waUrl: string } | { ok: false; error: string };

/**
 * «Hay disponibilidad»: pasa la reservación a «por pagar», genera su liga de pago y
 * regresa el mensaje de WhatsApp listo para enviarla al huésped. También sirve para reenviarla.
 */
export async function sendPaymentLink(id: number): Promise<PaymentLinkResult> {
  await requireAdmin();
  if (!stripeEnabled()) return { ok: false, error: "Configura STRIPE_SECRET_KEY en las variables de entorno para cobrar en línea." };
  const current = await getReservation(id);
  if (!current) return { ok: false, error: "No encontramos la reservación." };
  const [{ advance, templates }, pricing] = await Promise.all([getSettings(), getPricing()]);
  const amounts = computeCharge(advance, current, pricing.promo.enabled);
  if (amounts.due < STRIPE_MIN_MXN) {
    return { ok: false, error: `El cobro en línea sería de ${mxn(amounts.due)}; Stripe pide mínimo ${mxn(STRIPE_MIN_MXN)}. Revisa Ajustes.` };
  }

  const token = await requestPayment(id, randomBytes(24).toString("base64url"), amounts);
  const r = token ? await getReservation(id) : null;
  if (!r || !token) return { ok: false, error: "Solo se puede enviar la liga a reservaciones pendientes o por pagar sin pago previo." };

  const url = payUrl(await siteUrl(), token);
  const tpl = templates.find((t) => t.id === "liga_pago")!;
  revalidatePath("/admin", "layout");
  return { ok: true, payUrl: url, waUrl: whatsappTo(r.phone, renderTemplate(tpl.text, reservationVars(r, { liga: url }))) };
}

export type CancelResult = { ok: true; waUrl: string } | { ok: false; error: string };

/**
 * Cancelación a petición del huésped: invalida la liga de pago abierta, reembolsa por Stripe
 * lo indicado (0 = sin reembolso) y regresa el mensaje de WhatsApp de cancelación.
 */
export async function cancelReservation(id: number, refundAmount: number): Promise<CancelResult> {
  await requireAdmin();
  const r = await getReservation(id);
  if (!r) return { ok: false, error: "No encontramos la reservación." };
  if (r.status === "cancelada") return { ok: false, error: "La reservación ya está cancelada." };
  const amount = Math.round(Number(refundAmount) || 0);
  if (amount < 0 || amount > refundable(r)) return { ok: false, error: `El reembolso debe ser de $0 a ${mxn(refundable(r))}.` };

  try {
    await expireOpenSession(r);
    const refundRef = amount > 0 ? await refundPayment(r, amount) : null;
    await markCancelled(id, refundRef ? { amount, ref: refundRef } : undefined);
  } catch (e) {
    console.error("[stripe] no se pudo cancelar/reembolsar", e);
    return { ok: false, error: "Stripe rechazó la operación; la reservación no se canceló. Intenta de nuevo o revisa el Dashboard de Stripe." };
  }

  const { templates } = await getSettings();
  const tpl = templates.find((t) => t.id === "cancelacion")!;
  revalidatePath("/admin", "layout");
  return { ok: true, waUrl: whatsappTo(r.phone, renderTemplate(tpl.text, reservationVars(r, { reembolso: amount }))) };
}

/** Reembolso posterior (p. ej. se canceló sin reembolsar y luego se acordó devolver). */
export async function refundReservation(id: number, refundAmount: number): Promise<CancelResult> {
  await requireAdmin();
  const r = await getReservation(id);
  const amount = Math.round(Number(refundAmount) || 0);
  if (!r) return { ok: false, error: "No encontramos la reservación." };
  if (!(amount > 0 && amount <= refundable(r))) return { ok: false, error: `El reembolso debe ser de $1 a ${mxn(refundable(r))}.` };
  try {
    await addRefund(id, amount, await refundPayment(r, amount));
  } catch (e) {
    console.error("[stripe] no se pudo reembolsar", e);
    return { ok: false, error: "Stripe rechazó el reembolso. Revisa el Dashboard de Stripe." };
  }
  const { templates } = await getSettings();
  const tpl = templates.find((t) => t.id === "cancelacion")!;
  revalidatePath("/admin", "layout");
  return { ok: true, waUrl: whatsappTo(r.phone, renderTemplate(tpl.text, reservationVars(r, { reembolso: amount }))) };
}

export async function saveAdminNotes(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  await updateReservation(id, { admin_notes: str(fd, "admin_notes").slice(0, 2000) || null });
  revalidatePath(`/admin/reservaciones/${id}`);
  return { ok: "Notas guardadas." };
}

export async function createManualReservation(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const room = await getPricedRoom(str(fd, "room"));
  const checkIn = str(fd, "check_in");
  const checkOut = str(fd, "check_out");
  const rooms = num(fd, "rooms");
  const adults = num(fd, "adults");
  const children = num(fd, "children") || 0;
  const breakfasts = Math.max(0, num(fd, "breakfasts") || 0);
  const status = str(fd, "status") as Status;
  const name = str(fd, "name").slice(0, 120);
  const rawPhone = str(fd, "phone").slice(0, 30);
  const phone = rawPhone ? normalizePhone(str(fd, "phone_country") as PhoneCountry, rawPhone) : "";

  if (!room) return { error: "Elige una habitación." };
  if (!isDateKey(checkIn) || !isDateKey(checkOut)) return { error: "Fechas no válidas." };
  const nights = nightsBetweenKeys(checkIn, checkOut);
  if (nights < 1) return { error: "La salida debe ser posterior a la entrada." };
  if (!(rooms >= 1 && rooms <= 20)) return { error: "Número de habitaciones no válido." };
  if (!(adults >= 1) || adults + children > room.maxGuests * rooms) {
    return { error: `Máximo ${room.maxGuests * rooms} huéspedes para ${rooms} habitación(es) ${room.cardName.toLowerCase()}.` };
  }
  if (name.length < 2) return { error: "Escribe el nombre del huésped." };
  if (phone === null) return { error: "El teléfono debe tener 10 dígitos (México o Estados Unidos)." };
  if (!STATUSES.includes(status)) return { error: "Estado no válido." };

  const q = quote(room, { nights, roomCount: rooms, guests: adults + children, breakfasts }, await getPricing());
  const customTotal = num(fd, "total");
  const { id } = await insertReservation({
    status,
    source: "admin",
    channel: "recepcion",
    room: room.slug,
    rooms,
    adults,
    children,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    breakfasts: q.breakfasts,
    total: Number.isFinite(customTotal) && customTotal >= 0 ? customTotal : q.total,
    promo_total: null,
    name,
    phone,
    notes: str(fd, "notes").slice(0, 1000) || null,
    admin_notes: str(fd, "admin_notes").slice(0, 2000) || null,
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservaciones/${id}`);
}

/* ---------- Disponibilidad ---------- */

export async function addBlock(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const roomRaw = str(fd, "room");
  const room = roomRaw === "all" ? null : roomBySlug(roomRaw)?.slug;
  const start = str(fd, "start_date");
  const end = str(fd, "end_date") || start;
  if (room === undefined) return { error: "Elige una habitación." };
  if (!isDateKey(start) || !isDateKey(end)) return { error: "Fechas no válidas." };
  if (end < start) return { error: "La fecha final debe ser igual o posterior a la inicial." };
  await insertBlock({ room, start_date: start, end_date: end, reason: str(fd, "reason").slice(0, 200) || null });
  revalidatePath("/admin/disponibilidad");
  return { ok: "Fechas bloqueadas." };
}

export async function removeBlock(id: number) {
  await requireAdmin();
  await deleteBlock(id);
  revalidatePath("/admin/disponibilidad");
}

/* ---------- Ajustes ---------- */

export async function saveAdvanceSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const mode = str(fd, "mode") as AdvanceSettings["mode"];
  if (!["total", "porcentaje", "fijo"].includes(mode)) return { error: "Elige cómo cobrar." };
  const value = Number(str(fd, "value") || (mode === "total" ? 100 : NaN));
  if (mode === "porcentaje" && !(value >= 1 && value <= 100)) return { error: "El porcentaje debe ser de 1 a 100." };
  if (mode === "fijo" && !(value >= STRIPE_MIN_MXN)) return { error: `El monto fijo debe ser de al menos ${mxn(STRIPE_MIN_MXN)}.` };
  await saveSetting("advance", {
    mode,
    value: mode === "total" ? 100 : Math.round(value),
  } satisfies AdvanceSettings);
  revalidatePath("/admin", "layout");
  return { ok: "Ajustes de pago guardados. Aplican a las ligas que envíes desde ahora." };
}

export async function saveTemplates(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let list: Template[];
  try {
    list = JSON.parse(str(fd, "templates"));
    if (!Array.isArray(list)) throw new Error();
  } catch {
    return { error: "No se pudieron leer las plantillas." };
  }
  const clean = list
    .slice(0, 40)
    .map((t) => ({
      id: String(t.id ?? "").replace(/[^\w-]/g, "").slice(0, 40),
      label: String(t.label ?? "").trim().slice(0, 40),
      text: String(t.text ?? "").trim().slice(0, 1500),
    }))
    .filter((t) => t.id && t.label && t.text);
  if (clean.length !== list.length) return { error: "Cada respuesta necesita nombre y texto." };
  if (!clean.find((t) => t.id === "liga_pago")?.text.includes("{liga}")) {
    return { error: "La plantilla «Liga de pago» debe incluir {liga}." };
  }
  await saveSetting("templates", clean);
  revalidatePath("/admin", "layout");
  return { ok: "Respuestas guardadas." };
}

export async function savePrices(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const money = (k: string) => {
    const n = Number(str(fd, k));
    return Number.isInteger(n) && n >= 0 && n <= 100_000 ? n : NaN;
  };
  const rooms = {} as Pricing["rooms"];
  for (const slug of Object.keys(DEFAULT_PRICING.rooms) as (keyof Pricing["rooms"])[]) {
    const price = money(`${slug}_price`);
    const promoPrice = money(`${slug}_promo`);
    if (!(price > 0) || !(promoPrice > 0)) return { error: "Escribe precios enteros mayores a 0 para todas las habitaciones." };
    rooms[slug] = { price, promoPrice };
  }
  const breakfastPrice = money("breakfastPrice");
  const extraPersonFee = money("extraPersonFee");
  if (Number.isNaN(breakfastPrice) || Number.isNaN(extraPersonFee)) return { error: "Revisa el precio del desayuno y de la persona adicional." };

  const promoType = str(fd, "promo_type") === "porcentaje" ? "porcentaje" : "precio";
  const minNights = Number(str(fd, "promo_min_nights"));
  const percent = Number(str(fd, "promo_percent") || 0);
  if (!(Number.isInteger(minNights) && minNights >= 1 && minNights <= 30)) return { error: "Las noches mínimas de la promo deben ser de 1 a 30." };
  if (promoType === "porcentaje" && !(percent >= 1 && percent <= 90)) return { error: "El descuento de la promo debe ser de 1 % a 90 %." };
  if (promoType === "precio") {
    const bad = Object.entries(rooms).find(([, r]) => r.promoPrice > r.price);
    if (bad) return { error: "El precio promo no puede ser mayor al precio normal." };
  }
  await savePricing({
    rooms,
    breakfastPrice,
    extraPersonFee,
    promo: { enabled: fd.get("promo_enabled") === "on", minNights, type: promoType, percent: Math.round(percent) || DEFAULT_PRICING.promo.percent },
  });
  revalidatePath("/", "layout");
  return { ok: "Precios guardados. Ya se muestran en el sitio y aplican a las nuevas reservaciones." };
}
