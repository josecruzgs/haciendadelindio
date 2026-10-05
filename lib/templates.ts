import { getRoom, mxn } from "@/data/rooms";
import { site } from "@/data/site";
import { fmtKey } from "./dates";
import type { Reservation } from "./reservations";

/**
 * Respuestas de WhatsApp editables desde /admin/ajustes.
 * Se usan en el servidor (liga de pago, cancelación) y en el panel (respuestas rápidas).
 */

export type Template = { id: string; label: string; text: string; builtin?: boolean };

/** Plantillas que el sistema usa en acciones concretas; se pueden editar pero no borrar. */
export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "liga_pago",
    label: "Liga de pago",
    builtin: true,
    text: `Hola {nombre}, ¡buenas noticias! Tenemos disponibilidad para tu reservación {folio} en Hacienda del Indio:
• {habitacion}
• Del {entrada} al {salida} ({noches})
• {desayunos}
• Total de la estancia: {total} M.N.

Para confirmar tu reservación realiza tu pago de {anticipo} M.N. en esta liga segura:
{liga}`,
  },
  {
    id: "recordatorio_pago",
    label: "Recordatorio de pago",
    builtin: true,
    text: `Hola {nombre}, te recordamos que tu reservación {folio} ({entrada} al {salida}) sigue pendiente de pago. Puedes completarla aquí:
{liga}
Cualquier duda estamos para ayudarte.`,
  },
  {
    id: "sin_disponibilidad",
    label: "Sin disponibilidad",
    builtin: true,
    text: `Hola {nombre}, gracias por tu solicitud {folio} en Hacienda del Indio. Por el momento no tenemos disponibilidad de {habitacion} del {entrada} al {salida}. ¿Te podemos ofrecer otras fechas u otro tipo de habitación?`,
  },
  {
    id: "confirmacion",
    label: "Confirmación",
    builtin: true,
    text: `Hola {nombre}, tu reservación {folio} en Hacienda del Indio está confirmada: {habitacion}, del {entrada} al {salida}. {saldo_texto}¡Te esperamos!`,
  },
  {
    id: "reserva_vencida",
    label: "Apartado vencido",
    builtin: true,
    text: `Hola {nombre}, el apartado de tu reservación {folio} ({entrada} al {salida}) venció porque no recibimos el pago a tiempo, así que liberamos la habitación. Si aún quieres hospedarte con nosotros, puedes reservar de nuevo en nuestra página o responder este mensaje.`,
  },
  {
    id: "recordatorio_llegada",
    label: "Recordatorio de llegada",
    builtin: true,
    text: `Hola {nombre}, te esperamos mañana {entrada} en Hacienda del Indio (reservación {folio}). El check-in es a partir de las 15:00 h. {saldo_texto}Cualquier cosa llámanos al {telefono_hotel}.`,
  },
  {
    id: "cancelacion",
    label: "Cancelación",
    builtin: true,
    text: `Hola {nombre}, tal como nos pediste, cancelamos tu reservación {folio} del {entrada} al {salida}. {reembolso_texto}Esperamos recibirte en otra ocasión.`,
  },
];

export const DEFAULT_CUSTOM_TEMPLATES: Template[] = [
  { id: "c_saludo", label: "Responder", text: "Hola {nombre}, gracias por escribir a Hacienda del Indio. " },
  {
    id: "c_llegada",
    label: "Datos de llegada",
    text: "Hola {nombre}, te compartimos que el check-in es a partir de las 15:00 h. Estamos en Blvd. López Mateos, Mexicali. Cualquier cosa llámanos al {telefono_hotel}.",
  },
];

export const PLACEHOLDERS: [string, string][] = [
  ["{nombre}", "Nombre del huésped"],
  ["{folio}", "HDI-00001"],
  ["{habitacion}", "Tipo y número de habitaciones"],
  ["{entrada}", "Fecha de entrada"],
  ["{salida}", "Fecha de salida"],
  ["{noches}", "«2 noches»"],
  ["{huespedes}", "«2 adultos, 1 niño»"],
  ["{desayunos}", "«2 desayunos por día» o «Sin desayuno»"],
  ["{total}", "Total de la estancia"],
  ["{anticipo}", "Monto a pagar en línea"],
  ["{saldo}", "Saldo a pagar en recepción"],
  ["{liga}", "Liga de pago"],
  ["{vence}", "Hora límite para pagar (reserva en línea)"],
  ["{saldo_texto}", "Frase con el saldo pendiente (vacía si ya pagó todo)"],
  ["{reembolso_texto}", "Frase con el reembolso (vacía si no hubo)"],
  ["{telefono_hotel}", "Teléfono de recepción"],
];

export type TemplateVars = Record<string, string>;

/** Sustituye {variables}; las desconocidas se dejan tal cual. */
export const renderTemplate = (text: string, vars: TemplateVars) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m)).replace(/\n{3,}/g, "\n\n").trim();

/** Las plantillas que llevan {liga} solo tienen sentido si ya existe la liga de pago. */
export const needsPayLink = (t: Template) => t.text.includes("{liga}");

/** "3:45 p.m. del 5 de octubre" (hora de Mexicali). */
export function holdLabel(iso: string) {
  const d = new Date(iso);
  const tz = { timeZone: "America/Tijuana" } as const;
  const time = new Intl.DateTimeFormat("es-MX", { ...tz, hour: "numeric", minute: "2-digit" }).format(d);
  const day = new Intl.DateTimeFormat("es-MX", { ...tz, day: "numeric", month: "long" }).format(d);
  return `${time} del ${day}`;
}

/** Variables de una reservación para las plantillas. */
export function reservationVars(r: Reservation, extra: { liga?: string; reembolso?: number } = {}): TemplateVars {
  const room = getRoom(r.room);
  const long = { weekday: "long", day: "numeric", month: "long" } as const;
  const chargeTotal = r.charge_total ?? r.promo_total ?? r.total;
  const paid = (r.amount_paid ?? 0) + (r.desk_paid ?? 0);
  const saldo = Math.max(0, chargeTotal - paid);
  const refund = extra.reembolso ?? 0;
  return {
    nombre: r.name,
    folio: r.code,
    habitacion: `${room?.name ?? r.room}${r.rooms > 1 ? ` (x${r.rooms})` : ""}`,
    entrada: fmtKey(r.check_in, long),
    salida: fmtKey(r.check_out, long),
    noches: `${r.nights} noche${r.nights !== 1 ? "s" : ""}`,
    huespedes: `${r.adults} adulto${r.adults !== 1 ? "s" : ""}${r.children ? `, ${r.children} niño${r.children !== 1 ? "s" : ""}` : ""}`,
    desayunos: r.breakfasts ? `${r.breakfasts} desayuno${r.breakfasts !== 1 ? "s" : ""} por día` : "Sin desayuno",
    total: mxn(chargeTotal),
    anticipo: mxn(r.amount_due ?? chargeTotal),
    saldo: mxn(saldo),
    liga: extra.liga ?? "",
    vence: r.hold_until ? holdLabel(r.hold_until) : "",
    saldo_texto: paid > 0 && saldo > 0 ? `Recibimos tu pago de ${mxn(paid)}; el saldo de ${mxn(saldo)} se paga al llegar. ` : "",
    reembolso_texto: refund > 0 ? `Realizamos el reembolso de ${mxn(refund)} M.N. a tu tarjeta; puede tardar de 5 a 10 días hábiles en reflejarse. ` : "",
    telefono_hotel: site.phone.display,
  };
}
