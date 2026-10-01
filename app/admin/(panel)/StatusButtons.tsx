"use client";

import { useTransition } from "react";
import { setStatus } from "@/lib/actions/admin";
import type { Status } from "@/lib/reservations";

const actions: Record<Status, { to: Status; label: string; cls: string }[]> = {
  // La confirmación normal es con «Confirmar y enviar liga de pago» y la cancelación (con reembolso) en el detalle
  pendiente: [
    { to: "confirmada", label: "Confirmar sin pago en línea", cls: "bg-white text-teal ring-1 ring-teal/40 hover:bg-teal-light" },
  ],
  por_pagar: [
    { to: "confirmada", label: "Pagó en recepción · Confirmar", cls: "bg-white text-teal ring-1 ring-teal/40 hover:bg-teal-light" },
  ],
  confirmada: [
    { to: "completada", label: "Marcar completada", cls: "bg-ink text-white hover:bg-ink/85" },
  ],
  completada: [{ to: "confirmada", label: "Regresar a confirmada", cls: "bg-white text-ink ring-1 ring-black/15 hover:bg-sand-light" }],
  cancelada: [{ to: "pendiente", label: "Reabrir", cls: "bg-white text-ink ring-1 ring-black/15 hover:bg-sand-light" }],
};

export default function StatusButtons({ id, status, size = "sm" }: { id: number; status: Status; size?: "sm" | "md" }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {actions[status].map((a) => (
        <button
          key={a.to}
          type="button"
          disabled={pending}
          onClick={() => start(() => setStatus(id, a.to))}
          className={`rounded-md font-bold transition-colors disabled:opacity-50 ${a.cls} ${
            size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
