"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { todayKey } from "../dates";
import { roomBySlug } from "../pricing";
import { normalizePhone, type PhoneCountry } from "@/data/phone";
import { mxn } from "@/data/rooms";
import { balanceDue, getReservation } from "../reservations";
import {
  addDeskPayment,
  assignedRooms,
  assignRoom,
  deleteDeskPayment,
  HOUSEKEEPING,
  insertHotelRooms,
  markCheckedIn,
  markCheckedOut,
  PAY_METHODS,
  removeHotelRoom,
  saveGuestData,
  setHousekeeping,
  unassignRoom,
  undoCheckOut,
  updateHotelRoom,
  type Housekeeping,
  type PayMethod,
} from "../frontdesk";
import type { FormState } from "./admin";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string, max: number) => str(fd, k).slice(0, max) || null;

type Result = { ok: true; message?: string } | { ok: false; error: string };

const refresh = () => revalidatePath("/admin", "layout");

/* ---------- Habitaciones del hotel ---------- */

/** "1-10, 15, 20A" → ["1", …, "10", "15", "20A"] */
function parseNumbers(raw: string) {
  const out: string[] = [];
  for (const part of raw.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (b < a || b - a > 200) return null;
      for (let n = a; n <= b; n++) out.push(String(n));
    } else if (/^[\w-]{1,10}$/.test(part)) out.push(part);
    else return null;
  }
  return [...new Set(out)];
}

export async function addHotelRooms(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const type = roomBySlug(str(fd, "type"))?.slug;
  const numbers = parseNumbers(str(fd, "numbers"));
  if (!type) return { error: "Elige el tipo de habitación." };
  if (!numbers?.length) return { error: "Escribe los números, p. ej. «1-10» o «12, 14, 20A»." };
  const added = await insertHotelRooms(numbers, type);
  refresh();
  const skipped = numbers.length - added.length;
  if (!added.length) return { error: "Esas habitaciones ya existen." };
  return {
    ok: `${added.length === 1 ? "Se agregó 1 habitación" : `Se agregaron ${added.length} habitaciones`}${
      skipped ? ` (${skipped} ya existían)` : ""
    }.`,
  };
}

export async function editHotelRoom(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const number = str(fd, "number");
  const type = roomBySlug(str(fd, "type"))?.slug;
  if (!/^[\w-]{1,10}$/.test(number)) return { error: "Número no válido (letras, números o guion, hasta 10)." };
  if (!type) return { error: "Elige el tipo." };
  const ok = await updateHotelRoom(id, { number, type, notes: opt(fd, "notes", 200), active: fd.get("active") === "on" });
  if (!ok) return { error: `Ya existe otra habitación ${number}.` };
  refresh();
  return { ok: "Guardado." };
}

export async function deleteHotelRoom(id: number): Promise<Result> {
  await requireAdmin();
  const r = await removeHotelRoom(id);
  refresh();
  return { ok: true, message: r === "deleted" ? "Habitación eliminada." : "Tiene historial: se dio de baja en lugar de borrarla." };
}

export async function changeHousekeeping(id: number, hk: Housekeeping) {
  await requireAdmin();
  if (!HOUSEKEEPING.includes(hk)) return;
  await setHousekeeping(id, hk);
  refresh();
}

/* ---------- Asignación ---------- */

export async function assignRoomAction(reservationId: number, roomId: number): Promise<Result> {
  await requireAdmin();
  const r = await getReservation(reservationId);
  if (!r) return { ok: false, error: "No encontramos la reservación." };
  if (r.status === "cancelada" || r.status === "completada") return { ok: false, error: "La reservación ya no está activa." };
  if ((await assignedRooms(reservationId)).length >= r.rooms) {
    return { ok: false, error: `Ya tiene ${r.rooms === 1 ? "su habitación asignada" : `sus ${r.rooms} habitaciones asignadas`}. Quita una para cambiarla.` };
  }
  if (!(await assignRoom(reservationId, roomId))) {
    return { ok: false, error: "Esa habitación ya está ocupada en esas fechas o no es del tipo reservado." };
  }
  refresh();
  return { ok: true };
}

export async function unassignRoomAction(reservationId: number, roomId: number): Promise<Result> {
  await requireAdmin();
  const r = await getReservation(reservationId);
  if (r?.status === "completada") return { ok: false, error: "La estancia ya terminó; no se puede cambiar." };
  await unassignRoom(reservationId, roomId);
  refresh();
  return { ok: true };
}

/* ---------- Datos del huésped, entrada y salida ---------- */

function readGuest(fd: FormData) {
  const name = str(fd, "name").slice(0, 120);
  const raw = str(fd, "phone").slice(0, 30);
  const phone = raw ? normalizePhone(str(fd, "phone_country") as PhoneCountry, raw) : "";
  const email = opt(fd, "guest_email", 120);
  if (name.length < 2) return { error: "Escribe el nombre del huésped." } as const;
  if (phone === null) return { error: "El teléfono debe tener 10 dígitos (México o Estados Unidos)." } as const;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Correo no válido." } as const;
  return {
    guest: {
      name,
      phone,
      guest_email: email,
      guest_id: opt(fd, "guest_id", 80),
      guest_city: opt(fd, "guest_city", 80),
      vehicle: opt(fd, "vehicle", 80),
    },
  } as const;
}

export async function saveGuest(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const g = readGuest(fd);
  if ("error" in g) return { error: g.error };
  await saveGuestData(id, g.guest);
  refresh();
  return { ok: "Datos del huésped guardados." };
}

export async function checkIn(id: number): Promise<Result> {
  await requireAdmin();
  const r = await getReservation(id);
  if (!r) return { ok: false, error: "No encontramos la reservación." };
  if (!["pendiente", "por_pagar", "confirmada"].includes(r.status)) return { ok: false, error: "Esta reservación no puede registrar entrada." };
  if (r.check_in > todayKey()) return { ok: false, error: "La entrada es en una fecha futura. Cambia las fechas si llegó antes." };
  if (r.check_out <= todayKey()) return { ok: false, error: "La fecha de salida ya pasó; revisa las fechas de la reservación." };
  const assigned = await assignedRooms(id);
  if (assigned.length < r.rooms) {
    return { ok: false, error: r.rooms === 1 ? "Asigna la habitación antes de registrar la entrada." : `Asigna las ${r.rooms} habitaciones antes de registrar la entrada.` };
  }
  if (!(await markCheckedIn(id))) return { ok: false, error: "No se pudo registrar la entrada." };
  refresh();
  return { ok: true };
}

export async function checkOut(id: number, allowBalance: boolean): Promise<Result> {
  await requireAdmin();
  const r = await getReservation(id);
  if (!r) return { ok: false, error: "No encontramos la reservación." };
  if (r.status !== "hospedado") return { ok: false, error: "El huésped no está registrado como hospedado." };
  const owed = balanceDue(r);
  if (owed > 0 && !allowBalance) return { ok: false, error: `Queda un saldo de ${mxn(owed)}. Registra el pago o confirma la salida con saldo pendiente.` };
  if (!(await markCheckedOut(id))) return { ok: false, error: "No se pudo registrar la salida." };
  refresh();
  return { ok: true };
}

export async function undoCheckOutAction(id: number) {
  await requireAdmin();
  await undoCheckOut(id);
  refresh();
}

/* ---------- Pagos en recepción ---------- */

export async function addPayment(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await getReservation(id);
  const amount = Math.round(Number(str(fd, "amount")));
  const method = str(fd, "method") as PayMethod;
  if (!r || r.status === "cancelada") return { error: "La reservación no está activa." };
  if (!(amount > 0 && amount <= 1_000_000)) return { error: "Escribe un monto mayor a 0." };
  if (!PAY_METHODS.includes(method)) return { error: "Elige la forma de pago." };
  await addDeskPayment(id, amount, method, opt(fd, "note", 200));
  refresh();
  return { ok: `Pago de ${mxn(amount)} registrado.` };
}

export async function removePayment(reservationId: number, paymentId: number) {
  await requireAdmin();
  await deleteDeskPayment(reservationId, paymentId);
  refresh();
}
