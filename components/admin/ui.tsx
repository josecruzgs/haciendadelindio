import { getRoom, mxn } from "@/data/rooms";
import { fmtKey } from "@/lib/dates";
import type { Reservation, Status } from "@/lib/reservations";

export const statusMeta: Record<Status, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-orange/20 text-rust-dark ring-orange/40" },
  confirmada: { label: "Confirmada", cls: "bg-teal-light text-teal ring-teal/30" },
  completada: { label: "Completada", cls: "bg-ink/10 text-ink ring-ink/20" },
  cancelada: { label: "Cancelada", cls: "bg-rust/10 text-rust line-through ring-rust/20" },
};

export function StatusBadge({ status }: { status: Status }) {
  const m = statusMeta[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${m.cls}`}>{m.label}</span>
  );
}

export const roomLabel = (r: Reservation) =>
  `${getRoom(r.room)?.cardName ?? r.room}${r.rooms > 1 ? ` x${r.rooms}` : ""}`;

export const guestsLabel = (r: Reservation) =>
  `${r.adults} adulto${r.adults !== 1 ? "s" : ""}${r.children ? ` · ${r.children} niño${r.children !== 1 ? "s" : ""}` : ""}`;

export const stayLabel = (r: Reservation) =>
  `${fmtKey(r.check_in, { day: "numeric", month: "short" })} → ${fmtKey(r.check_out, { day: "numeric", month: "short", year: "numeric" })}`;

export const money = mxn;

/** "hace 5 min", "hace 3 h", o la fecha. */
export function ago(iso: string) {
  const t = Date.parse(iso.replace(" ", "T"));
  if (Number.isNaN(t)) return iso;
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "America/Tijuana" }).format(t);
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${className}`}>{children}</section>;
}
