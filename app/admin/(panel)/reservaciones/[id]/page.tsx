import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fmtKey, fmtKeyCap } from "@/lib/dates";
import { getReservation } from "@/lib/reservations";
import { getRoom } from "@/data/rooms";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { ago, Card, guestsLabel, money, StatusBadge } from "@/components/admin/ui";
import StatusButtons from "../../StatusButtons";
import NotesForm from "./NotesForm";

export const metadata: Metadata = { title: "Reservación" };

const waLink = (phone: string, text: string) => {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `52${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number.parseInt((await params).id, 10);
  const r = Number.isFinite(id) ? await getReservation(id) : null;
  if (!r) notFound();

  const room = getRoom(r.room);
  const long = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;
  const stay = `${room?.name ?? r.room}${r.rooms > 1 ? ` (x${r.rooms})` : ""}, del ${fmtKey(r.check_in, long)} al ${fmtKey(r.check_out, long)}`;
  const templates = [
    {
      label: "Confirmar",
      text: `Hola ${r.name}, tu reservación ${r.code} en Hacienda del Indio está confirmada: ${stay}. Total: ${money(r.total)} M.N. ¡Te esperamos!`,
    },
    {
      label: "Sin disponibilidad",
      text: `Hola ${r.name}, gracias por tu solicitud ${r.code}. Por el momento no tenemos disponibilidad para ${stay}. ¿Te podemos ofrecer otras fechas u otro tipo de habitación?`,
    },
  ];

  const rows: [string, React.ReactNode][] = [
    ["Habitación", `${room?.name ?? r.room}${r.rooms > 1 ? ` · ${r.rooms} habitaciones` : ""}`],
    ["Entrada", fmtKeyCap(r.check_in, long)],
    ["Salida", fmtKeyCap(r.check_out, long)],
    ["Noches", r.nights],
    ["Huéspedes", guestsLabel(r)],
    ["Desayuno", r.breakfast ? "Sí" : "No"],
    ["Total estimado", <strong key="t" className="font-heavy text-lg font-black text-rust">{money(r.total)} M.N.</strong>],
  ];
  if (r.promo_total) rows.push(["Tarifa promo (pago adelantado)", money(r.promo_total)]);

  return (
    <div className="space-y-5">
      <Link href="/admin/reservaciones" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:text-rust">
        <ArrowLeft className="size-4" aria-hidden="true" /> Reservaciones
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl text-teal">{r.code}</h1>
        <StatusBadge status={r.status} />
        <span className="text-sm text-ink/55">
          {r.source === "admin" ? "Captura manual" : "Solicitud web"} · recibida {ago(r.created_at)}
        </span>
        <div className="ml-auto">
          <StatusButtons id={r.id} status={r.status} size="md" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="font-display text-2xl text-teal">Estancia</h2>
          <dl className="mt-3 divide-y divide-black/5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink/60">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {r.notes && (
            <div className="mt-4 rounded-lg bg-sand-light p-3 text-sm">
              <p className="text-xs font-bold tracking-wide text-ink/55 uppercase">Comentarios del huésped</p>
              <p className="mt-1 whitespace-pre-line">{r.notes}</p>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="font-display text-2xl text-teal">Huésped</h2>
            <p className="mt-2 text-lg font-bold">{r.name}</p>
            <p className="text-ink/70">{r.phone}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-2 text-sm font-bold text-white hover:bg-teal-dark">
                <Phone className="size-4" aria-hidden="true" /> Llamar
              </a>
              {templates.map((t) => (
                <a
                  key={t.label}
                  href={waLink(r.phone, t.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#25d366] px-3 py-2 text-sm font-bold text-white hover:brightness-95"
                >
                  <WhatsAppIcon className="size-4" /> {t.label}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/50">Los botones de WhatsApp abren un mensaje listo para enviar al huésped.</p>
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-teal">Notas internas</h2>
            <NotesForm id={r.id} initial={r.admin_notes ?? ""} />
          </Card>
        </div>
      </div>
    </div>
  );
}
