"use client";

import { useActionState, useState } from "react";
import { saveAdvanceSettings } from "@/lib/actions/admin";
import { mxn } from "@/data/rooms";
import type { AdvanceSettings } from "@/lib/settings";

const input = "mt-1 w-36 rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const EXAMPLE = 2000;

const modes: { id: AdvanceSettings["mode"]; label: string; hint: string }[] = [
  { id: "total", label: "Pago total", hint: "Se cobra el 100 % de la estancia." },
  { id: "porcentaje", label: "Porcentaje", hint: "Un anticipo proporcional al total." },
  { id: "fijo", label: "Monto fijo", hint: "La misma cantidad en cada reservación (nunca más del total)." },
];

export default function AdvanceForm({ initial }: { initial: AdvanceSettings }) {
  const [state, action, pending] = useActionState(saveAdvanceSettings, undefined);
  const [mode, setMode] = useState(initial.mode);
  const [value, setValue] = useState(initial.mode === "total" ? 30 : initial.value);

  const due =
    mode === "total" ? EXAMPLE : mode === "porcentaje" ? Math.round((EXAMPLE * Math.min(100, Math.max(0, value))) / 100) : Math.min(EXAMPLE, value || 0);

  return (
    <form action={action} className="mt-4 space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Cómo cobrar</legend>
        {modes.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-black/10 px-3 py-2 has-[:checked]:border-teal has-[:checked]:bg-teal-light"
          >
            <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1 accent-teal" />
            <span>
              <span className="block text-sm font-bold">{m.label}</span>
              <span className="text-xs text-ink/60">{m.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode !== "total" && (
        <label className="block text-sm font-semibold text-ink/75">
          {mode === "porcentaje" ? "Porcentaje del total (%)" : "Monto fijo (M.N.)"}
          <input
            name="value"
            type="number"
            required
            min={mode === "porcentaje" ? 1 : 10}
            max={mode === "porcentaje" ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className={`${input} block`}
          />
        </label>
      )}

      <p className="text-xs text-ink/55">
        Si la reservación califica para la promoción por pago anticipado, el anticipo se calcula sobre el total con
        descuento (ver <a href="#precios" className="font-bold text-teal underline">Precios y promoción</a>).
      </p>

      <p className="rounded-lg bg-sand-light px-3 py-2 text-sm text-ink/75">
        Ejemplo: en una reservación de {mxn(EXAMPLE)} se cobran <strong>{mxn(due)}</strong> con la liga
        {due < EXAMPLE ? ` y ${mxn(EXAMPLE - due)} en recepción` : ""}.
      </p>

      {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
