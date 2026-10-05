"use client";

import { useTransition } from "react";
import { changeHousekeeping } from "@/lib/actions/frontdesk";
import type { Housekeeping } from "@/lib/frontdesk";

const options: { value: Housekeeping; label: string; cls: string }[] = [
  { value: "limpia", label: "Limpia", cls: "bg-teal text-white" },
  { value: "sucia", label: "Sucia", cls: "bg-orange text-teal-dark" },
  { value: "mantenimiento", label: "Mant.", cls: "bg-rust text-white" },
];

export default function HousekeepingButtons({ id, value }: { id: number; value: Housekeeping }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1" role="group" aria-label="Estado de limpieza">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={pending || o.value === value}
          aria-pressed={o.value === value}
          onClick={() => start(() => changeHousekeeping(id, o.value))}
          className={`flex-1 rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
            o.value === value ? o.cls : "bg-sand-light text-ink/60 hover:bg-sand"
          } disabled:cursor-default ${pending ? "opacity-60" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
