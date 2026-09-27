"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkCredentials, createSession, destroySession, rateLimited, requireAdmin } from "../auth";
import { isDateKey, nightsBetweenKeys } from "../dates";
import { quote, roomBySlug } from "../pricing";
import {
  deleteBlock,
  insertBlock,
  insertReservation,
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
  if (!STATUSES.includes(status)) return;
  await updateReservation(id, { status });
  revalidatePath("/admin", "layout");
}

export async function saveAdminNotes(id: number, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  await updateReservation(id, { admin_notes: str(fd, "admin_notes").slice(0, 2000) || null });
  revalidatePath(`/admin/reservaciones/${id}`);
  return { ok: "Notas guardadas." };
}

export async function createManualReservation(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const room = roomBySlug(str(fd, "room"));
  const checkIn = str(fd, "check_in");
  const checkOut = str(fd, "check_out");
  const rooms = num(fd, "rooms");
  const adults = num(fd, "adults");
  const children = num(fd, "children") || 0;
  const breakfast = fd.get("breakfast") === "on";
  const status = str(fd, "status") as Status;
  const name = str(fd, "name").slice(0, 120);
  const phone = str(fd, "phone").slice(0, 30);

  if (!room) return { error: "Elige una habitación." };
  if (!isDateKey(checkIn) || !isDateKey(checkOut)) return { error: "Fechas no válidas." };
  const nights = nightsBetweenKeys(checkIn, checkOut);
  if (nights < 1) return { error: "La salida debe ser posterior a la entrada." };
  if (!(rooms >= 1 && rooms <= 20)) return { error: "Número de habitaciones no válido." };
  if (!(adults >= 1) || adults + children > room.maxGuests * rooms) {
    return { error: `Máximo ${room.maxGuests * rooms} huéspedes para ${rooms} habitación(es) ${room.cardName.toLowerCase()}.` };
  }
  if (name.length < 2) return { error: "Escribe el nombre del huésped." };
  if (!STATUSES.includes(status)) return { error: "Estado no válido." };

  const q = quote(room, { nights, roomCount: rooms, guests: adults + children, breakfast });
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
    breakfast,
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
