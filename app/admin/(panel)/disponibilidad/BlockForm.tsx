"use client";

import { useActionState, useRef, useState, useTransition, useEffect } from "react";
import { addBlock, removeBlock } from "@/lib/actions/admin";
import { rooms } from "@/data/rooms";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const label = "block text-sm font-semibold text-ink/75";

export default function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addBlock, undefined);
  const [start, setStart] = useState(today);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3">
      <label className={label}>
        Habitación
        <select name="room" defaultValue="all" className={input}>
          <option value="all">Todas (hotel lleno)</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Desde la noche del
          <input name="start_date" type="date" required min={today} defaultValue={today} onChange={(e) => setStart(e.target.value)} className={input} />
        </label>
        <label className={label}>
          Hasta la noche del
          <input name="end_date" type="date" min={start} className={input} />
        </label>
      </div>
      <p className="text-xs text-ink/55">Ambas noches incluidas. Deja «Hasta» vacío para bloquear una sola noche.</p>
      <label className={label}>
        Motivo (opcional)
        <input name="reason" placeholder="Grupo, mantenimiento, evento…" className={input} />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
        {pending ? "Guardando…" : "Bloquear"}
      </button>
    </form>
  );
}

export function RemoveBlockButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className="rounded-md px-3 py-1 text-xs font-bold text-rust ring-1 ring-rust/40 hover:bg-rust/10">
        Quitar
      </button>
    );
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-ink/60">¿Liberar estas fechas?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => removeBlock(id))}
        className="rounded-md bg-rust px-3 py-1 font-bold text-white disabled:opacity-60"
      >
        Sí, quitar
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="font-semibold text-ink/60">
        No
      </button>
    </span>
  );
}
