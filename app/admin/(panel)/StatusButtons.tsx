"use client";

import { useTransition } from "react";
import { setStatus } from "@/lib/actions/admin";
import type { Status } from "@/lib/reservations";

const actions: Record<Status, { to: Status; label: string; cls: string }[]> = {
  pendiente: [
    { to: "confirmada", label: "Confirmar", cls: "bg-teal text-white hover:bg-teal-dark" },
    { to: "cancelada", label: "Cancelar", cls: "bg-white text-rust ring-1 ring-rust/40 hover:bg-rust/10" },
  ],
  confirmada: [
    { to: "completada", label: "Marcar completada", cls: "bg-ink text-white hover:bg-ink/85" },
    { to: "cancelada", label: "Cancelar", cls: "bg-white text-rust ring-1 ring-rust/40 hover:bg-rust/10" },
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
