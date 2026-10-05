import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheckBig, Clock, Lock, Phone, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { getRoom, mxn } from "@/data/rooms";
import { site, whatsappUrl } from "@/data/site";
import { fmtKeyCap } from "@/lib/dates";
import { balanceDue, getReservationByToken, type Reservation } from "@/lib/reservations";
import { settleSession, stripe, stripeEnabled } from "@/lib/stripe";
import { holdLabel } from "@/lib/templates";
import { sweepHolds } from "@/lib/holds";
import PayButton from "./PayButton";

export const metadata: Metadata = {
  title: { absolute: "Pago de reservación | Hacienda del Indio" },
  robots: { index: false, follow: false },
};

const long = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { token } = await params;
  const { session_id } = await searchParams;
  await sweepHolds();
  let r = await getReservationByToken(token);
  if (!r) notFound();

  // Regreso desde Stripe: se verifica el pago aquí también por si el webhook aún no llega
  let processing = false;
  if (session_id && !r.paid_at && stripeEnabled()) {
    const session = await stripe().checkout.sessions.retrieve(session_id).catch(() => null);
    if (session && session.metadata?.reservation_id === String(r.id)) {
      if (await settleSession(session)) r = (await getReservationByToken(token)) ?? r;
      else processing = session.status === "complete"; // p. ej. pago en OXXO pendiente
    }
  }

  const amount = r.amount_due ?? r.promo_total ?? r.total;

  return (
    <section className="bg-sand-light px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 sm:p-8">
        {r.status === "cancelada" && r.expired_at && !r.paid_at ? (
          <Header icon={<Clock className="size-12 text-rust" />} title="El apartado venció">
            No recibimos el pago a tiempo y la habitación se liberó.{" "}
            <a href="/reservar" className="font-bold text-teal underline underline-offset-4">
              Reserva de nuevo
            </a>{" "}
            o escríbenos y con gusto te ayudamos.
          </Header>
        ) : r.status === "cancelada" ? (
          <Header icon={<XCircle className="size-12 text-rust" />} title="Reservación cancelada">
            {r.refunded_amount > 0
              ? `Te reembolsamos ${mxn(r.refunded_amount)} M.N. a tu tarjeta; puede tardar de 5 a 10 días hábiles en reflejarse.`
              : "Esta reservación ya no está activa. Escríbenos y con gusto te ayudamos a encontrar otra opción."}
          </Header>
        ) : r.paid_at ? (
          <Header icon={<CircleCheckBig className="size-12 text-teal" />} title="¡Reservación confirmada!">
            Recibimos tu pago. Tu estancia está asegurada; te esperamos en Hacienda del Indio.
          </Header>
        ) : processing ? (
          <Header icon={<Clock className="size-12 text-orange" />} title="Pago en proceso">
            Tu pago se está procesando. En cuanto se acredite, tu reservación quedará confirmada.
          </Header>
        ) : r.status === "por_pagar" ? (
          <Header icon={<Lock className="size-12 text-teal" />} title="Completa tu reservación">
            ¡Tenemos disponibilidad para ti! Realiza tu pago para confirmar tu reservación.
            {r.hold_until && (
              <strong className="mt-2 block text-rust">Tu habitación está apartada hasta las {holdLabel(r.hold_until)}.</strong>
            )}
          </Header>
        ) : (
          <Header icon={<Clock className="size-12 text-orange" />} title="Reservación en proceso">
            Recepción está revisando la disponibilidad. Te enviaremos la liga de pago en cuanto se confirme.
          </Header>
        )}

        <Summary r={r} amount={amount} />

        {r.paid_at && r.payment_ref?.startsWith("pi_") && (
          <p className="mt-4 text-center">
            <a href={`/pagar/${token}/recibo`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-teal underline underline-offset-4">
              Ver recibo de pago
            </a>
          </p>
        )}

        {!r.paid_at && !processing && r.status === "por_pagar" && (
          <>
            <PayButton token={token} label={`Pagar ${mxn(amount)} M.N.`} />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/60">
              <Lock className="size-3.5" aria-hidden="true" /> Pago seguro con tarjeta procesado por Stripe.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-black/10 pt-5 text-sm">
          <a
            href={whatsappUrl(`Hola, tengo una duda sobre mi reservación ${r.code}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#25d366] px-3 py-2 font-bold text-[#128c4a] hover:bg-[#25d366] hover:text-white"
          >
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
          <a
            href={site.phone.href}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-teal px-3 py-2 font-bold text-teal hover:bg-teal hover:text-white"
          >
            <Phone className="size-4" aria-hidden="true" /> {site.phone.display}
          </a>
        </div>
      </div>
    </section>
  );
}

function Header({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center" role="status">
      <div className="flex justify-center" aria-hidden="true">
        {icon}
      </div>
      <h1 className="mt-3 font-display text-4xl text-teal">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-ink/75">{children}</p>
    </div>
  );
}

function Summary({ r, amount }: { r: Reservation; amount: number }) {
  const room = getRoom(r.room);
  const total = r.charge_total ?? r.promo_total ?? r.total;
  const rows: [string, string][] = [
    ["Folio", r.code],
    ["Huésped", r.name],
    ["Habitación", `${room?.name ?? r.room}${r.rooms > 1 ? ` x${r.rooms}` : ""}`],
    ["Entrada", fmtKeyCap(r.check_in, long)],
    ["Salida", fmtKeyCap(r.check_out, long)],
    ["Noches", String(r.nights)],
    ["Huéspedes", `${r.adults} adulto${r.adults !== 1 ? "s" : ""}${r.children ? `, ${r.children} niño${r.children !== 1 ? "s" : ""}` : ""}`],
    ["Desayunos", r.breakfasts ? `${r.breakfasts} por día` : "Sin desayuno"],
  ];
  const money: [string, string, boolean?][] = [["Total de la estancia", mxn(total)]];
  if (r.paid_at) {
    money.push(["Pagado", mxn(r.amount_paid ?? 0), true]);
    if (r.status !== "cancelada" && balanceDue(r) > 0) money.push(["Saldo a pagar al llegar", mxn(balanceDue(r))]);
    if (r.refunded_amount > 0) money.push(["Reembolsado", mxn(r.refunded_amount)]);
  } else if (amount < total) {
    money.push(["Anticipo a pagar ahora", mxn(amount), true], ["Saldo a pagar al llegar", mxn(total - amount)]);
  } else {
    money.push(["Total a pagar", mxn(amount), true]);
  }
  return (
    <dl className="mt-6 divide-y divide-black/5 rounded-xl bg-sand-light/60 px-4 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2">
          <dt className="text-ink/60">{k}</dt>
          <dd className="text-right font-semibold">{v}</dd>
        </div>
      ))}
      {money.map(([k, v, strong]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className={strong ? "font-bold" : "text-ink/60"}>{k}</dt>
          <dd className={strong ? "font-heavy text-2xl font-black text-rust" : "font-semibold"}>
            {v} {strong && <span className="text-xs font-bold text-ink/60">M.N.</span>}
          </dd>
        </div>
      ))}
      {r.promo_total != null && total === r.promo_total && r.promo_total < r.total && (
        <p className="pb-3 text-xs text-ink/60">Incluye tarifa promo por pago anticipado (antes {mxn(r.total)}).</p>
      )}
    </dl>
  );
}
