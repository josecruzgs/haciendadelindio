"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/reservaciones", label: "Reservaciones" },
  { href: "/admin/reservaciones/nueva", label: "Nueva", exact: true },
  { href: "/admin/disponibilidad", label: "Disponibilidad" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export default function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  const isActive = (l: (typeof links)[number]) =>
    l.exact ? path === l.href : path.startsWith(l.href) && path !== "/admin/reservaciones/nueva";

  return (
    <nav aria-label="Panel" className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            isActive(l) ? "bg-cream text-teal" : "text-cream/85 hover:bg-white/10"
          }`}
        >
          {l.label}
          {l.href === "/admin/reservaciones" && pending > 0 && (
            <span className="rounded-full bg-orange px-1.5 text-xs font-extrabold text-teal-dark" aria-label={`${pending} pendientes`}>
              {pending}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
