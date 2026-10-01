import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/admin";
import { query } from "@/lib/db";
import { maybeAutoPurge } from "@/lib/cleanup";
import AdminNav from "./AdminNav";
import AutoRefresh from "./AutoRefresh";

export const metadata: Metadata = {
  title: { default: "Panel | Hacienda del Indio", template: "%s | Panel Hacienda del Indio" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  let pending = 0;
  let dbError: string | null = null;
  try {
    await maybeAutoPurge(); // limpieza automática, como máximo una vez al día
    [{ n: pending }] = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM reservations WHERE status = 'pendiente'`);
  } catch (e) {
    // Mostrar la causa al administrador en vez del error genérico de Next
    console.error("[panel] no se pudo conectar a la base de datos", e);
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-dvh bg-sand-light">
      <header className="bg-teal text-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/images/isotipo-blanco.png" alt="" width={600} height={491} className="h-8 w-auto" />
            <span className="font-display text-xl leading-none">Panel · Hacienda del Indio</span>
          </Link>
          <AdminNav pending={pending} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-cream/80 hover:text-white sm:inline-flex">
              Ver sitio <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
            <span className="hidden text-cream/60 md:inline">{session.user}</span>
            <form action={logout}>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-teal-dark px-3 py-1.5 font-semibold hover:bg-black/30">
                <LogOut className="size-4" aria-hidden="true" /> Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {dbError ? (
          <div role="alert" className="max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-2 ring-rust/40">
            <h1 className="font-display text-3xl text-rust">No se pudo conectar a la base de datos</h1>
            <p className="mt-2 text-sm text-ink/75">
              El panel necesita la base de datos para mostrar las reservaciones. Detalle del error:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-sand-light p-3 text-xs whitespace-pre-wrap text-ink">{dbError}</pre>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink/75">
              <li>
                En Vercel → proyecto → <strong>Settings → Environment Variables</strong> debe existir{" "}
                <code>DATABASE_URL</code> (sin prefijo) para Production.
              </li>
              <li>Después de agregar o cambiar variables hay que hacer <strong>Redeploy</strong>.</li>
              <li>Si usas Neon, revisa que la base no esté pausada o eliminada.</li>
            </ul>
          </div>
        ) : (
          children
        )}
      </main>
      <AutoRefresh />
    </div>
  );
}
