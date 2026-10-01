"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { cancelReservation, refundReservation } from "@/lib/actions/admin";
import { mxn } from "@/data/rooms";

/**
 * Cancelar solo cuando el huésped lo pide por WhatsApp: invalida la liga de pago abierta,
 * reembolsa (total, parcial o nada) y abre WhatsApp con el mensaje de cancelación.
 * En modo «refund» (reservación ya cancelada) solo reembolsa.
 */
export default function CancelPanel({ id, refundable, mode }: { id: number; refundable: number; mode: "cancel" | "refund" }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(refundable);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return mode === "cancel" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-bold text-rust ring-1 ring-rust/40 hover:bg-rust/10"
      >
        <XCircle className="size-4" aria-hidden="true" /> Cancelar a petición del cliente
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-bold text-rust ring-1 ring-rust/40 hover:bg-rust/10"
      >
        <RotateCcw className="size-4" aria-hidden="true" /> Reembolsar {mxn(refundable)}
      </button>
    );
  }

  const run = () => {
    setError("");
    const tab = notify ? window.open("", "_blank") : null;
    if (tab) tab.opener = null;
    start(async () => {
      const fn = mode === "cancel" ? cancelReservation : refundReservation;
      const res = await fn(id, amount).catch(() => ({ ok: false as const, error: "Sin conexión. Intenta de nuevo." }));
      if (!res.ok) {
        tab?.close();
        setError(res.error);
        return;
      }
      if (tab) tab.location.href = res.waUrl;
      setOpen(false);
    });
  };

  return (
    <div className="rounded-xl bg-rust/5 p-4 ring-1 ring-rust/30">
      <p className="font-bold text-rust-dark">{mode === "cancel" ? "Cancelar reservación" : "Reembolsar pago"}</p>
      {mode === "cancel" && (
        <p className="mt-1 text-sm text-ink/70">
          Hazlo solo si el cliente pidió cancelar. La liga de pago dejará de funcionar.
        </p>
      )}

      {refundable > 0 ? (
        <label className="mt-3 block text-sm font-semibold text-ink/75">
          Monto a reembolsar por Stripe (máx. {mxn(refundable)})
          <input
            type="number"
            min={mode === "cancel" ? 0 : 1}
            max={refundable}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.min(refundable, Number(e.target.value) || 0)))}
            className="mt-1 block w-40 rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <span className="mt-1 block text-xs font-normal text-ink/55">
            {mode === "cancel" ? "Pon 0 para cancelar sin reembolso (puedes reembolsar después)." : "Puede ser parcial."}
          </span>
        </label>
      ) : (
        mode === "cancel" && <p className="mt-2 text-sm text-ink/60">No hay pagos en línea que reembolsar.</p>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-ink/75">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-teal" />
        Abrir WhatsApp con el mensaje de cancelación para el cliente
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending || (mode === "refund" && amount < 1)}
          className="inline-flex items-center gap-2 rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {mode === "cancel"
            ? amount > 0
              ? `Cancelar y reembolsar ${mxn(amount)}`
              : "Cancelar sin reembolso"
            : `Reembolsar ${mxn(amount)}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5">
          No, volver
        </button>
      </div>
    </div>
  );
}
