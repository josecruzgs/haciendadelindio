"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarCheck, ChevronDown, Menu, X } from "lucide-react";
import { FacebookIcon } from "./BrandIcons";
import { site } from "@/data/site";

type NavItem = {
  label: string;
  href: string;
  match?: (path: string) => boolean;
  children?: { label: string; href: string }[];
};

const items: NavItem[] = [
  {
    label: "Reservaciones",
    href: "/reservar",
    match: (p) => p.startsWith("/reservar") || p.startsWith("/habitaciones"),
    children: [
      { label: "Reservar en línea", href: "/reservar" },
      { label: "Habitaciones", href: "/habitaciones" },
      { label: "Habitación Sencilla", href: "/habitaciones/sencilla" },
      { label: "Habitación Doble", href: "/habitaciones/doble" },
      { label: "Habitación Triple", href: "/habitaciones/triple" },
    ],
  },
  {
    label: "Servicios",
    href: "/#servicios",
    match: (p) => p.startsWith("/menu"),
    children: [
      { label: "Servicios", href: "/#servicios" },
      { label: "Restaurante 24/7", href: "/menu" },
    ],
  },
  { label: "Ubicación", href: "/#ubicacion" },
  { label: "Contacto", href: "#contacto" },
];

export default function MainNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Cerrar menús al navegar o al hacer clic fuera
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Principal"
      className="sticky top-0 z-40 border-b border-black/5 bg-sand/95 backdrop-blur supports-[backdrop-filter]:bg-sand/85"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Inicio">
          <Image src="/images/isotipo-color.png" alt="" width={600} height={491} className="h-9 w-auto" />
          <span className="font-display hidden text-lg leading-none text-rust uppercase sm:inline lg:hidden xl:inline">
            Hacienda del Indio
          </span>
        </Link>

        {/* Escritorio */}
        <ul className="hidden items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = item.match?.(pathname) ?? false;
            const expanded = openMenu === item.label;
            return (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenMenu(item.label)}
                onMouseLeave={() => item.children && setOpenMenu(null)}
              >
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={`font-display px-3 py-2 text-2xl font-medium tracking-tight transition-colors hover:text-rust ${
                      active ? "text-rust" : "text-ink"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <button
                      type="button"
                      aria-label={`Abrir submenú ${item.label}`}
                      aria-expanded={expanded}
                      onClick={() => setOpenMenu(expanded ? null : item.label)}
                      className="-ml-2 rounded p-1 text-ink/60 hover:text-rust"
                    >
                      <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {item.children && expanded && (
                  <ul className="absolute left-0 top-full min-w-56 overflow-hidden rounded-b-lg bg-white py-1 shadow-xl ring-1 ring-black/5">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className="block px-4 py-2.5 text-sm font-semibold text-ink hover:bg-orange hover:text-white"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href={site.facebook.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook de Hacienda del Indio"
            className="hidden rounded-full p-2 text-teal hover:bg-teal hover:text-white sm:inline-flex"
          >
            <FacebookIcon className="size-5" />
          </a>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 rounded-md bg-rust px-4 py-2 font-heavy text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-rust-dark"
          >
            <CalendarCheck className="size-4" aria-hidden="true" />
            Reservar
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-ink lg:hidden"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Móvil */}
      {mobileOpen && (
        <div className="border-t border-black/5 bg-sand lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-3">
            {items.map((item) => (
              <li key={item.label} className="border-b border-black/5 last:border-0">
                <Link
                  href={item.href}
                  className={`font-display block py-2 text-2xl ${item.match?.(pathname) ? "text-rust" : "text-ink"}`}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="pb-2 pl-4">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block py-1.5 text-sm font-semibold text-ink/80">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li className="pt-3">
              <a href={site.facebook.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
                <FacebookIcon className="size-5" /> {site.facebook.handle}
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
