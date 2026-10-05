import type { Metadata } from "next";
import { Clock, Phone, ShieldCheck } from "lucide-react";
import BookingWidget from "@/components/booking/BookingWidget";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { getRoom, mxn, withPricing, type Room } from "@/data/rooms";
import { getPricing } from "@/lib/catalog";
import { publicAutoBooking } from "@/lib/availability";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: "Reservar | Hacienda del Indio" },
  description:
    "Reserva tu habitación en Hacienda del Indio, Mexicali. Elige fechas, habitación y huéspedes y envía tu solicitud por WhatsApp.",
  alternates: { canonical: "/reservar" },
};

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ habitacion?: string }>;
}) {
  const { habitacion } = await searchParams;
  const initial: Room["slug"] = getRoom(habitacion ?? "")?.slug ?? "doble";

  const [pricing, autoBooking] = await Promise.all([getPricing(), publicAutoBooking()]);
  const { breakfastPrice, extraPersonFee } = pricing;
  const rooms = withPricing(pricing);
  const promoList = rooms.map((r) => `${r.cardName} ${mxn(r.promoPrice)}`).join(", ");
  const faqs = [
    {
      q: "¿Cómo se confirma mi reservación?",
      a: autoBooking
        ? "Si hay disponibilidad en tus fechas, apartamos tu habitación y pasas directo al pago seguro con tarjeta. Al pagar, tu reservación queda confirmada al instante."
        : "Al enviar tu solicitud tu reservación queda en proceso. Recepción verifica la disponibilidad y te envía por WhatsApp un link de pago seguro; al pagar, tu reservación queda confirmada.",
    },
    {
      q: "¿Hay tarifa especial por varias noches?",
      a: pricing.promo.enabled
        ? `Sí. Al reservar ${pricing.promo.minNights} noches o más y pagar en línea por adelantado aplica la tarifa promo por noche (${promoList}). Aplican restricciones.`
        : "Por el momento no hay promociones activas. Escríbenos por WhatsApp para estancias largas o grupos.",
    },
    {
      q: "¿Cuánto cuesta una persona adicional o el desayuno?",
      a: `La persona adicional tiene un costo de ${mxn(extraPersonFee)} M.N. por noche y el desayuno ${mxn(breakfastPrice)} por persona.`,
    },
    { q: "¿Se admiten mascotas?", a: "No, por el momento no se admiten mascotas." },
  ];

  return (
    <>
      <section className="bg-[linear-gradient(var(--color-orange)_0_55%,var(--color-sand)_55%)]">
        <div className="tipi-divider" aria-hidden="true" />
        <div className="mx-auto max-w-4xl px-3 pt-8 pb-14 sm:px-4">
          <h1 className="mb-6 text-center font-display text-4xl text-teal-dark md:text-5xl">Reservaciones</h1>
          <BookingWidget key={initial} initialRoom={initial} pricing={pricing} autoBooking={autoBooking} />
        </div>
      </section>

      <section className="bg-sand pb-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-4xl text-teal">Preguntas frecuentes</h2>
            <div className="mt-4 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <summary className="cursor-pointer list-none font-bold text-ink">
                    <span className="mr-2 inline-block text-rust transition-transform group-open:rotate-90">›</span>
                    {f.q}
                  </summary>
                  <p className="mt-2 pl-5 text-ink/80">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <aside className="self-start rounded-2xl bg-teal p-6 text-cream shadow-lg">
            <h2 className="font-display text-3xl">¿Prefieres hablar con nosotros?</h2>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-3">
                <Clock className="size-5 text-orange-soft" aria-hidden="true" /> Recepción abierta 24/7
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-orange-soft" aria-hidden="true" /> Tarifa preferencial en recepción
              </li>
            </ul>
            <div className="mt-6 grid gap-3">
              <a href={site.phone.href} className="flex items-center justify-center gap-2 rounded-lg bg-cream px-4 py-3 font-bold text-teal hover:bg-white">
                <Phone className="size-5" aria-hidden="true" /> {site.phone.display}
              </a>
              <a
                href={site.whatsapp.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-4 py-3 font-bold text-white hover:brightness-95"
              >
                <WhatsAppIcon className="size-5" /> {site.whatsapp.display}
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
