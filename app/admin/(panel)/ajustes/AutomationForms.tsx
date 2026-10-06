"use client";

import { useActionState } from "react";
import { saveBookingSettings } from "@/lib/actions/admin";

const input = "mt-1 w-32 rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";

export function BookingForm({ initial }: { initial: { auto: boolean; holdMinutes: number; checkInTime: string; checkOutTime: string } }) {
  const [state, action, pending] = useActionState(saveBookingSettings, undefined);
  return (
    <form action={action} className="mt-3 space-y-3">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="auto" defaultChecked={initial.auto} className="mt-0.5 size-5 accent-teal" />
        <span>
          <span className="block font-bold text-ink">Reservar y cobrar en automático</span>
          <span className="block text-xs text-ink/60">
            Si hay habitaciones libres, el huésped paga en línea al reservar y la reservación se confirma sola. Si está
            apagado, cada solicitud llega como pendiente para confirmarla a mano.
          </span>
        </span>
      </label>
      <label className="block text-sm font-semibold text-ink/75">
        Minutos de apartado para pagar
        <input name="holdMinutes" type="number" min={30} max={1440} defaultValue={initial.holdMinutes} className={`${input} block`} />
        <span className="mt-1 block text-xs font-normal text-ink/55">
          De 30 a 1440. Si no paga en ese tiempo, se cancela sola, se libera la habitación.
        </span>
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="block text-sm font-semibold text-ink/75">
          Hora de entrada
          <input name="checkInTime" type="time" defaultValue={initial.checkInTime} className={`${input} block`} />
        </label>
        <label className="block text-sm font-semibold text-ink/75">
          Hora de salida
          <input name="checkOutTime" type="time" defaultValue={initial.checkOutTime} className={`${input} block`} />
        </label>
      </div>
      <p className="-mt-1 text-xs text-ink/55">Se muestran en el recibo de pago de Stripe. Vacío = no se muestra.</p>
      {state?.error && <p role="alert" className="text-sm font-semibold text-rust">{state.error}</p>}
      {state?.ok && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-dark disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
