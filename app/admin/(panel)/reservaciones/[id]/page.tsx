import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fmtKeyCap } from "@/lib/dates";
import { balanceDue, getReservation, refundable } from "@/lib/reservations";
import { advanceLabel, computeCharge, getSettings } from "@/lib/settings";
import { getPricing } from "@/lib/catalog";
import { payUrl, siteUrl } from "@/lib/stripe";
import { needsPayLink, renderTemplate, reservationVars } from "@/lib/templates";
import { getRoom } from "@/data/rooms";
import { whatsappTo } from "@/data/site";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { ago, Card, ChannelTag, guestsLabel, money, StatusBadge } from "@/components/admin/ui";
import StatusButtons from "../../StatusButtons";
import CancelPanel from "./CancelPanel";
import NotesForm from "./NotesForm";
import PaymentActions from "./PaymentActions";

export const metadata: Metadata = { title: "Reservación" };

export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number.parseInt((await params).id, 10);
  const r = Number.isFinite(id) ? await getReservation(id) : null;
  if (!r) notFound();

  const [{ advance, templates }, pricing] = await Promise.all([getSettings(), getPricing()]);
  const room = getRoom(r.room);
  const long = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;
  const reviewing = (r.status === "pendiente" || r.status === "por_pagar") && !r.paid_at;
  const payLink = r.pay_token ? payUrl(await siteUrl(), r.pay_token) : null;
  const vars = reservationVars(r, { liga: payLink ?? undefined });
  const wa = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    return t ? whatsappTo(r.phone, renderTemplate(t.text, vars)) : "";
  };
  // Respuestas rápidas: todas menos las que usan acciones propias; las que llevan {liga} solo si ya hay liga
  // (sin disponibilidad y recordatorio solo mientras se espera el pago)
  const own = ["liga_pago", "cancelacion", ...(r.status !== "por_pagar" ? ["sin_disponibilidad", "recordatorio_pago"] : [])];
  const quick = templates.filter((t) => !own.includes(t.id) && (!needsPayLink(t) || (payLink && r.status === "por_pagar")));
  const preview = computeCharge(advance, r, pricing.promo.enabled);
  const canRefund = refundable(r);

  const rows: [string, React.ReactNode][] = [
    ["Habitación", `${room?.name ?? r.room}${r.rooms > 1 ? ` · ${r.rooms} habitaciones` : ""}`],
    ["Entrada", fmtKeyCap(r.check_in, long)],
    ["Salida", fmtKeyCap(r.check_out, long)],
    ["Noches", r.nights],
    ["Huéspedes", guestsLabel(r)],
    ["Desayunos", r.breakfasts ? `${r.breakfasts} por día (${r.breakfasts * r.nights} en total)` : "No"],
    ["Total estimado", <strong key="t" className="font-heavy text-lg font-black text-rust">{money(r.total)} M.N.</strong>],
  ];
  if (r.promo_total) rows.push(["Total con promo (pago en línea)", money(r.promo_total)]);
  if (r.charge_total != null && r.charge_total !== r.total) rows.push(["Total acordado", `${money(r.charge_total)} M.N.`]);
  if (r.amount_due != null) rows.push(["Cobro en línea", `${money(r.amount_due)} M.N.`]);
  if (r.paid_at) {
    rows.push([
      "Pagado",
      <span key="p" className="text-teal">
        {money(r.amount_paid ?? 0)} · {ago(r.paid_at)}
        {r.payment_ref && <span className="block text-xs font-normal text-ink/50">Stripe: {r.payment_ref}</span>}
      </span>,
    ]);
    if (r.status !== "cancelada") rows.push(["Saldo en recepción", `${money(balanceDue(r))} M.N.`]);
  }
  if (r.refunded_amount > 0) {
    rows.push([
      "Reembolsado",
      <span key="rf" className="text-rust">
        {money(r.refunded_amount)}
        {r.refund_ref && <span className="block text-xs font-normal text-ink/50">Stripe: {r.refund_ref}</span>}
      </span>,
    ]);
  }
  if (r.cancelled_at) rows.push(["Cancelada", ago(r.cancelled_at)]);

  return (
    <div className="space-y-5">
      <Link href="/admin/reservaciones" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:text-rust">
        <ArrowLeft className="size-4" aria-hidden="true" /> Reservaciones
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl text-teal">{r.code}</h1>
        <StatusBadge status={r.status} reservation={r} />
        <span className="text-sm text-ink/55">
          <ChannelTag channel={r.channel} /> · recibida {ago(r.created_at)}
        </span>
        <div className="ml-auto">
          <StatusButtons id={r.id} status={r.status} size="md" />
        </div>
      </div>

      {reviewing && (
        <Card className="ring-2 ring-teal/30">
          <h2 className="font-display text-2xl text-teal">{r.status === "por_pagar" ? "Esperando pago" : "Revisar disponibilidad"}</h2>
          <p className="mt-1 text-xs text-ink/55">
            {advanceLabel(advance)}: se cobrarán <strong>{money(preview.due)}</strong> en línea
            {preview.due < preview.total ? ` de ${money(preview.total)}; el saldo se paga en recepción` : ""}.{" "}
            <Link href="/admin/ajustes" className="font-bold text-teal underline">
              Cambiar en Ajustes
            </Link>
          </p>
          <div className="mt-3">
            <PaymentActions id={r.id} status={r.status} payLink={payLink} noAvailabilityUrl={wa("sin_disponibilidad")} />
          </div>
        </Card>
      )}

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
          <div className="mt-5 border-t border-black/5 pt-4">
            {r.status !== "cancelada" && r.status !== "completada" && (
              <CancelPanel key={`c-${r.status}`} id={r.id} refundable={canRefund} mode="cancel" />
            )}
            {r.status === "cancelada" && canRefund > 0 && (
              <CancelPanel key={`r-${canRefund}`} id={r.id} refundable={canRefund} mode="refund" />
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="font-display text-2xl text-teal">Huésped</h2>
            <p className="mt-2 text-lg font-bold">{r.name}</p>
            <p className="text-ink/70">{r.phone}</p>
            <a
              href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-2 text-sm font-bold text-white hover:bg-teal-dark"
            >
              <Phone className="size-4" aria-hidden="true" /> Llamar
            </a>

            <h3 className="mt-5 text-xs font-bold tracking-wide text-ink/55 uppercase">Responder por WhatsApp</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {quick.map((t) => (
                <a
                  key={t.id}
                  href={wa(t.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={renderTemplate(t.text, vars)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#25d366] px-3 py-2 text-sm font-bold text-white hover:brightness-95"
                >
                  <WhatsAppIcon className="size-4" /> {t.label}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/50">
              Cada botón abre WhatsApp con el mensaje listo para el huésped.{" "}
              <Link href="/admin/ajustes#respuestas" className="font-bold text-teal underline">
                Editar respuestas
              </Link>
            </p>
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
