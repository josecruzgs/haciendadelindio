import Image from "next/image";
import Link from "next/link";
import { Briefcase, Coffee, CupSoda, MapPin, Popcorn, UtensilsCrossed, Wifi } from "lucide-react";
import BookingWidget from "@/components/booking/BookingWidget";
import RoomCard from "@/components/RoomCard";
import MapEmbed from "@/components/MapEmbed";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { getPricing } from "@/lib/catalog";
import { publicAutoBooking } from "@/lib/availability";
import { withPricing } from "@/data/rooms";
import { site, whatsappUrl } from "@/data/site";

export default async function Home() {
  const [pricing, autoBooking] = await Promise.all([getPricing(), publicAutoBooking()]);
  const rooms = withPricing(pricing);
  return (
    <>
      {/* 1 · Promo dividida (como en home.jpg) */}
      <section className="grid md:grid-cols-2">
        <div className="relative flex flex-col items-center overflow-hidden bg-orange px-6 pt-10 text-center md:pt-14">
          <h1 className="font-display text-xl tracking-wide text-teal-dark uppercase md:text-2xl">
            Descanso y comodidad para tu tribu.
          </h1>
          <p className="mt-4 font-heavy text-[clamp(3.5rem,11vw,7rem)] leading-[0.85] font-black text-teal">TARIFA</p>
          <p className="font-heavy text-[clamp(1.75rem,5.4vw,3.4rem)] leading-none font-black text-teal">PREFERENCIAL</p>
          <p className="-mt-1 font-script text-[clamp(2.6rem,7.5vw,4.6rem)] leading-tight text-cream drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]">
            en recepción
          </p>
          <Link
            href="#reservar"
            className="relative z-10 mt-4 inline-block bg-rust px-10 py-2.5 font-heavy text-2xl font-extrabold text-white shadow-md transition-colors hover:bg-rust-dark md:text-3xl"
          >
            reserva aquí
          </Link>
          <Image
            src="/images/familia.png"
            alt="Familia sonriente con maletas lista para hospedarse en Hacienda del Indio"
            width={933}
            height={1080}
            priority
            sizes="(min-width: 768px) 320px, 70vw"
            className="-mt-6 w-[70%] max-w-xs md:w-[55%]"
          />
        </div>
        <div className="grid grid-rows-2 gap-0.5 bg-sand">
          <div className="relative min-h-60">
            <Image
              src="/images/zona-fachada-palmeras.jpg"
              alt="Fachada estilo hacienda con arcos rojos, balcones y palmeras"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative min-h-60">
            <Image
              src="/images/hab-toallas-espejo.jpg"
              alt="Toallas bordadas con el logotipo y cama de la habitación al fondo"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 2 · Reservación (como en "home buscador agenda reservacion.jpg") */}
      <section id="reservar" className="scroll-mt-16 bg-[linear-gradient(var(--color-orange)_0_62%,var(--color-sand)_62%)]">
        <div className="tipi-divider" aria-hidden="true" />
        <div className="mx-auto max-w-4xl px-3 pt-10 pb-14 sm:px-4 md:pt-14">
          <BookingWidget pricing={pricing} autoBooking={autoBooking} />
        </div>
      </section>

      {/* 3 · Servicios */}
      <section id="servicios" className="scroll-mt-16 bg-sand py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="font-display text-5xl text-teal md:text-6xl">Servicios</h2>
            <p className="mx-auto mt-2 max-w-xl text-lg text-ink/80">
              Deliciosos platillos y comodidades que aseguran tu descanso.
            </p>
          </div>

          <div className="mt-10 grid items-center gap-4 md:grid-cols-[auto_1fr_1fr_auto] md:gap-4">
            <ul className="order-2 flex justify-center gap-8 md:order-none md:flex-col md:gap-12">
              <ServiceIcon icon={Wifi} label="Wifi gratis" />
              <ServiceIcon icon={UtensilsCrossed} label="Cocina 24/7" />
            </ul>
            <PhotoCard src="/images/zona-comedor-sala.jpg" alt="Comedor con mesas de mármol y sala con sillones turquesa" />
            <PhotoCard src="/images/zona-recepcion.jpg" alt="Recepción de madera con mural de artesanías de Baja California" />
            <ul className="order-3 flex justify-center gap-8 md:order-none md:flex-col md:gap-12">
              <ServiceIcon icon={Coffee} label="Café" />
              <ServiceIcon icon={Popcorn} label="Botanas" />
            </ul>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { src: "/images/comida-carne-asada.jpg", alt: "Plato de carne asada con cebolla, frijoles, arroz y queso" },
              { src: "/images/comida-desayuno-charola.jpg", alt: "Desayuno servido en charola de madera con café" },
              { src: "/images/comida-enchiladas.jpg", alt: "Enchiladas con crema, arroz y frijoles" },
            ].map((p) => (
              <div key={p.src} className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-md">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/menu"
              className="rounded-md bg-teal px-6 py-3 font-heavy font-extrabold text-white shadow hover:bg-teal-dark"
            >
              Ver Menú
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm">
              <CupSoda className="size-5 text-rust" aria-hidden="true" /> Desayuno desde $75 por persona
            </span>
          </div>
        </div>
      </section>

      {/* 4 · Habitaciones */}
      <section id="habitaciones" className="scroll-mt-16 bg-sand-light py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="font-display text-5xl text-teal md:text-6xl">Habitaciones</h2>
            <p className="mx-auto mt-2 max-w-xl text-lg text-ink/80">
              Todo tipo de habitaciones para el descanso de tu familia o tu equipo de trabajo.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.slug} room={room} />
            ))}
          </div>
        </div>
      </section>

      {/* 5 · Empresas / cuadrillas */}
      <section className="relative overflow-hidden bg-teal py-14 text-cream">
        <Image
          src="/images/zona-estacionamiento.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-15"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold tracking-widest text-orange-soft uppercase">
              <Briefcase className="size-4" aria-hidden="true" /> Para empresas y cuadrillas
            </p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">Tu equipo de trabajo, bien descansado.</h2>
            <p className="mt-3 max-w-2xl text-lg text-cream/85">
              Habitaciones triples para hasta 6 personas, estacionamiento incluido, cocina 24/7 y lavandería
              completa. Cotiza varias habitaciones para tu cuadrilla y te preparamos una tarifa.
            </p>
          </div>
          <a
            href={whatsappUrl("Hola, quiero cotizar hospedaje para mi equipo de trabajo en Hacienda del Indio.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-6 py-3 font-heavy font-extrabold text-teal-dark shadow-lg hover:bg-orange-soft"
          >
            <WhatsAppIcon className="size-5" /> Cotizar para mi equipo
          </a>
        </div>
      </section>

      {/* 6 · Ubicación */}
      <section id="ubicacion" className="scroll-mt-16 bg-sand py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-5xl text-teal md:text-6xl">Ubicación</h2>
            <p className="mt-4 flex items-start gap-2 text-lg">
              <MapPin className="mt-1 size-5 shrink-0 text-rust" aria-hidden="true" />
              <span>
                <strong>Dirección:</strong> {site.address.full}
              </span>
            </p>
            <p className="mt-2 text-ink/75">Cerca de todo en Mexicali: comodidad y cercanía para tu viaje de trabajo o en familia.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={site.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-teal px-5 py-2.5 font-bold text-white hover:bg-teal-dark"
              >
                Cómo llegar
              </a>
              <Link href="#contacto" className="rounded-md border-2 border-rust px-5 py-2 font-bold text-rust hover:bg-rust hover:text-white">
                Reserva Aquí
              </Link>
            </div>
          </div>
          <MapEmbed />
        </div>
      </section>
    </>
  );
}

function ServiceIcon({ icon: Icon, label }: { icon: typeof Wifi; label: string }) {
  return (
    <li className="flex flex-col items-center gap-1 text-ink">
      <Icon className="size-12" strokeWidth={1.8} aria-hidden="true" />
      <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
    </li>
  );
}

function PhotoCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden shadow-md">
      <Image src={src} alt={alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
    </div>
  );
}
