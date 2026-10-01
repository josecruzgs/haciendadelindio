import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, CalendarCheck, PawPrint, Users } from "lucide-react";
import Gallery from "@/components/Gallery";
import AmenityList from "@/components/AmenityList";
import RoomCard from "@/components/RoomCard";
import { getRoom, mxn, promoLabel, withPricing } from "@/data/rooms";
import { getPricing } from "@/lib/catalog";

type Params = { slug: string };

// Dinámica: los precios se editan desde el panel. Los slugs desconocidos dan 404 abajo.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const room = getRoom((await params).slug);
  if (!room) return {};
  return {
    title: { absolute: `${room.name} | Hacienda del Indio` },
    description: room.metaDescription,
    alternates: { canonical: `/habitaciones/${room.slug}` },
    openGraph: { images: [room.images[0].src] },
  };
}

export default async function RoomPage({ params }: { params: Promise<Params> }) {
  const slug = (await params).slug;
  const pricing = await getPricing();
  const priced = withPricing(pricing);
  const room = priced.find((r) => r.slug === slug);
  if (!room) notFound();
  const others = priced.filter((r) => r.slug !== room.slug);

  return (
    <>
      <section className="bg-sand-light py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <Link href="/habitaciones" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:text-rust">
            <ArrowLeft className="size-4" aria-hidden="true" /> Todas las habitaciones
          </Link>

          <div className="mt-4 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <Gallery images={room.images} label={`Fotos de la ${room.name}`} />

            <div>
              <h1 className="font-display text-5xl text-teal">{room.name}</h1>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink/80">
                <li className="flex items-center gap-1.5">
                  <BedDouble className="size-5 text-rust" aria-hidden="true" /> {room.capacity}
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="size-5 text-rust" aria-hidden="true" /> Máx. {room.maxGuests} personas
                </li>
              </ul>

              <div id="reservaciondehs" className="mt-6 scroll-mt-20 rounded-2xl bg-white p-5 shadow-md ring-1 ring-black/5">
                <p className="font-heavy text-4xl font-black text-rust">
                  {mxn(room.price)} <span className="text-base font-bold text-ink/60">M.N. por noche</span>
                </p>
                <p className="mt-1 text-sm text-ink/75">
                  Persona adicional: +{mxn(pricing.extraPersonFee)} M.N. (sobre el monto final)
                </p>
                {promoLabel(pricing) && room.promoPrice < room.price && (
                  <p className="mt-3 rounded-lg bg-orange/15 px-3 py-2 text-sm">
                    <strong className="text-rust-dark">{promoLabel(pricing)}:</strong> {mxn(room.promoPrice)} por noche
                    pagando en línea por adelantado. Aplican restricciones.
                  </p>
                )}
                <Link
                  href={`/reservar?habitacion=${room.slug}`}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-rust px-5 py-3 font-heavy text-lg font-extrabold text-white shadow hover:bg-rust-dark"
                >
                  <CalendarCheck className="size-5" aria-hidden="true" /> Reserva Aquí
                </Link>
                <p className="mt-4 flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-extrabold tracking-wider text-white uppercase">
                  <PawPrint className="size-4" aria-hidden="true" /> No se admiten mascotas
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sand py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl text-teal">Amenidades</h2>
          <div className="mt-6">
            <AmenityList />
          </div>
        </div>
      </section>

      <section className="bg-sand-light py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl text-teal">Otras habitaciones</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {others.map((r) => (
              <RoomCard key={r.slug} room={r} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
