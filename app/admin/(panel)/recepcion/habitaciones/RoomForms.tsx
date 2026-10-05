"use client";

import { useActionState, useState, useTransition } from "react";
import { addHotelRooms, deleteHotelRoom, editHotelRoom } from "@/lib/actions/frontdesk";
import { rooms } from "@/data/rooms";
import type { HotelRoom } from "@/lib/frontdesk";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const label = "block text-sm font-semibold text-ink/75";

export function AddRoomsForm() {
  const [state, action, pending] = useActionState(addHotelRooms, undefined);
  return (
    <form action={action} className="mt-3 space-y-3">
      <label className={label}>
        Números
        <input name="numbers" required placeholder="1-10, 12, 20A" className={input} />
        <span className="mt-1 block text-xs font-normal text-ink/55">Un rango (1-10) o varios separados por coma.</span>
      </label>
      <label className={label}>
        Tipo
        <select name="type" defaultValue="doble" className={input}>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
      {state?.ok && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
        {pending ? "Agregando…" : "Agregar habitaciones"}
      </button>
    </form>
  );
}

export function RoomRow({ room }: { room: HotelRoom }) {
  const [state, action, pending] = useActionState(editHotelRoom.bind(null, room.id), undefined);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [removing, start] = useTransition();
  return (
    <li className={`py-3 ${room.active ? "" : "opacity-60"}`}>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="w-20 text-xs font-semibold text-ink/60">
          Número
          <input name="number" defaultValue={room.number} required className={input} />
        </label>
        <label className="w-40 text-xs font-semibold text-ink/60">
          Tipo
          <select name="type" defaultValue={room.type} className={input}>
            {rooms.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.cardName}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-40 flex-1 text-xs font-semibold text-ink/60">
          Notas
          <input name="notes" defaultValue={room.notes ?? ""} placeholder="Planta baja, vista al jardín…" className={input} />
        </label>
        <label className="flex items-center gap-1.5 pb-2.5 text-sm font-semibold text-ink/70">
          <input type="checkbox" name="active" defaultChecked={room.active} className="size-4 accent-teal" /> Activa
        </label>
        <button disabled={pending} className="rounded-md bg-teal px-3 py-2 text-sm font-bold text-white hover:bg-teal-dark disabled:opacity-60">
          {pending ? "…" : "Guardar"}
        </button>
        {confirm ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={removing}
              onClick={() => start(async () => {
                const r = await deleteHotelRoom(room.id);
                setMsg(r.ok ? (r.message ?? null) : r.error);
                setConfirm(false);
              })}
              className="rounded-md bg-rust px-3 py-2 text-sm font-bold text-white hover:bg-rust-dark"
            >
              Sí, quitar
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="rounded-md px-2 py-2 text-sm font-semibold text-ink/60">
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="rounded-md px-3 py-2 text-sm font-bold text-rust hover:bg-rust/10">
            Quitar
          </button>
        )}
      </form>
      {(state?.error || state?.ok || msg) && (
        <p className={`mt-1 text-xs font-semibold ${state?.error ? "text-rust" : "text-teal"}`}>{state?.error ?? msg ?? state?.ok}</p>
      )}
    </li>
  );
}
