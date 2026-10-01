"use client";

import { useActionState, useMemo, useState } from "react";
import { createManualReservation } from "@/lib/actions/admin";
import { mxn, withPricing, type Pricing } from "@/data/rooms";
import { quote } from "@/lib/pricing";
import PhoneInput from "@/components/PhoneInput";
import type { PhoneCountry } from "@/data/phone";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const label = "block text-sm font-semibold text-ink/75";

export default function NewReservationForm({ today, tomorrow, pricing }: { today: string; tomorrow: string; pricing: Pricing }) {
  const rooms = useMemo(() => withPricing(pricing), [pricing]);
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("MX");
  const [state, action, pending] = useActionState(createManualReservation, undefined);
  const [f, setF] = useState({ room: "doble", rooms: 1, adults: 2, children: 0, check_in: today, check_out: tomorrow, breakfasts: 0 });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const room = rooms.find((r) => r.slug === f.room)!;
  const nights = Math.round((Date.parse(f.check_out) - Date.parse(f.check_in)) / 86_400_000);
  const q = nights > 0 ? quote(room, { nights, roomCount: f.rooms || 1, guests: f.adults + f.children, breakfasts: f.breakfasts }, pricing) : null;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={label}>
        Habitación
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
        <input name="check_in" type="date" required value={f.check_in} onChange={set("check_in")} className={input} />
      </label>
      <label className={label}>
        Salida
        <input name="check_out" type="date" required min={f.check_in} value={f.check_out} onChange={set("check_out")} className={input} />
      </label>
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
      <label className={label}>
        Estado
        <select name="status" defaultValue="confirmada" className={input}>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </label>
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
      <label className={`${label} sm:col-span-2`}>
        Comentarios del huésped
        <textarea name="notes" rows={2} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Notas internas
        <textarea name="admin_notes" rows={2} placeholder="Anticipo, habitación asignada, factura…" className={input} />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button disabled={pending} className="rounded-md bg-rust px-5 py-2.5 font-bold text-white hover:bg-rust-dark disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar reservación"}
        </button>
      </div>
    </form>
  );
}
