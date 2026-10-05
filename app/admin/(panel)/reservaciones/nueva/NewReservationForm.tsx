"use client";

import { useActionState, useMemo, useState } from "react";
import { createManualReservation } from "@/lib/actions/admin";
import { mxn, withPricing, type Pricing } from "@/data/rooms";
import { quote } from "@/lib/pricing";
import PhoneInput from "@/components/PhoneInput";
import type { PhoneCountry } from "@/data/phone";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const label = "block text-sm font-semibold text-ink/75";

const addDay = (k: string) => {
  const d = new Date(`${k}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

type HotelRoomOpt = { id: number; number: string; type: string; housekeeping: string };
type Busy = { room_id: number; check_in: string; check_out: string };

const payMethods = [
  ["efectivo", "Efectivo"],
  ["tarjeta", "Tarjeta"],
  ["transferencia", "Transferencia"],
] as const;

export default function NewReservationForm({
  today, tomorrow, pricing, hotelRooms, busy, walkIn: initialWalkIn, roomId,
}: {
  today: string;
  tomorrow: string;
  pricing: Pricing;
  hotelRooms: HotelRoomOpt[];
  busy: Busy[];
  walkIn: boolean;
  /** Habitación elegida desde el rack de recepción. */
  roomId: number | null;
}) {
  const rooms = useMemo(() => withPricing(pricing), [pricing]);
  const preset = hotelRooms.find((h) => h.id === roomId);
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("MX");
  const [state, action, pending] = useActionState(createManualReservation, undefined);
  const [walkIn, setWalkIn] = useState(initialWalkIn);
  const [roomIds, setRoomIds] = useState<number[]>(preset ? [preset.id] : []);
  const [f, setF] = useState({
    room: preset?.type ?? "doble", rooms: 1, adults: 2, children: 0, check_in: today, check_out: tomorrow, breakfasts: 0,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (k === "room") setRoomIds([]);
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  };
  const checkIn = walkIn ? today : f.check_in;
  // Habitaciones del tipo elegido y si están libres en las fechas
  const candidates = hotelRooms
    .filter((h) => h.type === f.room)
    .map((h) => ({
      ...h,
      taken: busy.some((b) => b.room_id === h.id && b.check_in < f.check_out && b.check_out > checkIn),
    }));
  const toggleRoom = (id: number) =>
    setRoomIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-Math.max(1, f.rooms))));

  const room = rooms.find((r) => r.slug === f.room)!;
  const nights = Math.round((Date.parse(f.check_out) - Date.parse(checkIn)) / 86_400_000);
  const q = nights > 0 ? quote(room, { nights, roomCount: f.rooms || 1, guests: f.adults + f.children, breakfasts: f.breakfasts }, pricing) : null;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-start gap-3 rounded-lg bg-sand-light p-3 sm:col-span-2">
        <input
          type="checkbox"
          name="walkin"
          checked={walkIn}
          onChange={(e) => setWalkIn(e.target.checked)}
          className="mt-0.5 size-5 accent-rust"
        />
        <span>
          <span className="block font-bold text-ink">Llegada en mostrador: registrar la entrada ahora</span>
          <span className="block text-xs text-ink/60">
            Para huéspedes que llegan sin reservación. Entra hoy y queda como «Hospedado» en la habitación elegida.
          </span>
        </span>
      </label>
      <label className={label}>
        Tipo de habitación
        <select name="room" value={f.room} onChange={set("room")} className={input}>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name} — {mxn(r.price)} (máx. {r.maxGuests})
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Número de habitaciones
        <input name="rooms" type="number" min={1} max={20} value={f.rooms} onChange={set("rooms")} className={input} />
      </label>
      <label className={label}>
        Entrada
        <input
          name="check_in"
          type="date"
          required
          value={checkIn}
          onChange={set("check_in")}
          readOnly={walkIn}
          className={`${input} ${walkIn ? "bg-sand-light" : ""}`}
        />
      </label>
      <label className={label}>
        Salida
        <input name="check_out" type="date" required min={addDay(checkIn)} value={f.check_out} onChange={set("check_out")} className={input} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className={label}>
          {walkIn ? "Habitación donde se hospeda" : "Asignar habitación (opcional)"}
          {f.rooms > 1 && <span className="font-normal text-ink/55"> · elige {f.rooms}</span>}
        </legend>
        {candidates.length === 0 ? (
          <p className="mt-1 text-sm text-ink/60">
            {hotelRooms.length === 0 ? (
              <>
                Aún no hay habitaciones dadas de alta.{" "}
                <a href="/admin/recepcion/habitaciones" className="font-bold text-teal underline">Agregarlas</a>
              </>
            ) : (
              "No hay habitaciones de este tipo."
            )}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {candidates.map((h) => {
              // Si al cambiar las fechas la habitación deja de estar libre, se desmarca sola
              const off = h.taken || (walkIn && h.housekeeping === "mantenimiento");
              const on = roomIds.includes(h.id) && !off;
              return (
                <label
                  key={h.id}
                  title={h.taken ? "Ocupada en esas fechas" : h.housekeeping !== "limpia" ? h.housekeeping : "Libre"}
                  className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ${
                    off ? "cursor-not-allowed bg-ink/5 text-ink/30 line-through ring-black/5" : on ? "bg-teal text-white ring-teal" : "bg-white text-teal ring-teal/30 hover:bg-teal-light"
                  }`}
                >
                  <input type="checkbox" name="room_ids" value={h.id} checked={on} disabled={off} onChange={() => toggleRoom(h.id)} className="sr-only" />
                  {h.number}
                  {!off && h.housekeeping === "sucia" && <span className="ml-1 text-[10px] font-semibold opacity-75">sucia</span>}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <label className={label}>
        Adultos
        <input name="adults" type="number" min={1} value={f.adults} onChange={set("adults")} className={input} />
      </label>
      <label className={label}>
        Niños
        <input name="children" type="number" min={0} value={f.children} onChange={set("children")} className={input} />
      </label>
      <label className={label}>
        Nombre del huésped
        <input name="name" required className={input} />
      </label>
      <div className={label} role="group" aria-label="Teléfono">
        Teléfono
        <div className="mt-1 rounded-lg border-2 border-black/10 px-3 py-2 text-sm font-normal focus-within:border-teal">
          <PhoneInput country={phoneCountry} value={phone} onCountry={setPhoneCountry} onChange={setPhone} name="phone" />
        </div>
      </div>
      <label className={label}>
        Desayunos por día
        <input
          name="breakfasts"
          type="number"
          min={0}
          max={f.adults + f.children}
          value={f.breakfasts}
          onChange={set("breakfasts")}
          className={input}
        />
        <span className="mt-1 block text-xs font-normal text-ink/55">0 = sin desayuno. Máximo uno por huésped.</span>
      </label>
      {!walkIn && (
        <label className={label}>
          Estado
          <select name="status" defaultValue="confirmada" className={input}>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </label>
      )}
      <label className={label}>
        Total (M.N.)
        <input
          name="total"
          type="number"
          min={0}
          placeholder={q ? String(q.total) : ""}
          className={input}
        />
        <span className="mt-1 block text-xs font-normal text-ink/55">
          {q ? `Calculado: ${mxn(q.total)} por ${nights} noche${nights !== 1 ? "s" : ""}. Déjalo vacío para usarlo.` : "Revisa las fechas."}
        </span>
      </label>
      <fieldset className="grid gap-4 rounded-lg border-2 border-black/5 p-3 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 text-sm font-bold text-ink/75">Datos de registro{walkIn ? "" : " (opcional)"}</legend>
        <label className={label}>
          Correo
          <input name="guest_email" type="email" className={input} />
        </label>
        <label className={label}>
          Identificación
          <input name="guest_id" placeholder="INE, pasaporte…" className={input} />
        </label>
        <label className={label}>
          Procedencia
          <input name="guest_city" placeholder="Ciudad, estado" className={input} />
        </label>
        <label className={label}>
          Vehículo / placas
          <input name="vehicle" placeholder="Modelo, color, placas" className={input} />
        </label>
      </fieldset>
      <fieldset className="grid gap-4 rounded-lg border-2 border-black/5 p-3 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 text-sm font-bold text-ink/75">Pago recibido ahora (opcional)</legend>
        <label className={label}>
          Monto
          <input name="paid_now" type="number" min={0} placeholder="0" className={input} />
        </label>
        <label className={label}>
          Forma de pago
          <select name="pay_method" defaultValue="efectivo" className={input}>
            {payMethods.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <label className={`${label} sm:col-span-2`}>
        Comentarios del huésped
        <textarea name="notes" rows={2} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Notas internas
        <textarea name="admin_notes" rows={2} placeholder="Factura, peticiones especiales…" className={input} />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button disabled={pending} className="rounded-md bg-rust px-5 py-2.5 font-bold text-white hover:bg-rust-dark disabled:opacity-60">
          {pending ? "Guardando…" : walkIn ? "Registrar llegada" : "Guardar reservación"}
        </button>
      </div>
    </form>
  );
}
