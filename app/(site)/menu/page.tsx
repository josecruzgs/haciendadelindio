import type { Metadata } from "next";
import Image from "next/image";
import { ConciergeBell, Coffee, Download } from "lucide-react";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { breakfastPrice, mxn } from "@/data/rooms";
import { site, whatsappUrl } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: "Menú | Hacienda del Indio" },
  description: "Restaurante 24/7 de Hacienda del Indio: descarga nuestro menú de deliciosos platillos hasta tu habitación.",
  alternates: { canonical: "/menu" },
};

const dishes = [
  { src: "/images/comida-mesa-completa.jpg", alt: "Mesa con varios platillos mexicanos, café y cubiertos" },
  { src: "/images/comida-carne-asada.jpg", alt: "Carne asada con cebolla, arroz, frijoles y pico de gallo" },
  { src: "/images/comida-sopes.jpg", alt: "Sopes con salsa, arroz y frijoles con queso" },
  { src: "/images/comida-enchiladas.jpg", alt: "Enchiladas bañadas en salsa con crema y tomate" },
  { src: "/images/comida-hamburguesa.jpg", alt: "Hamburguesa con papas a la francesa" },
  { src: "/images/comida-burritos.jpg", alt: "Burritos con arroz, frijoles y salsa" },
];

export default function MenuPage() {
  return (
    <>
      <section className="bg-sand-light py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl text-teal md:text-6xl">Restaurante 24/7</h1>
            <p className="mt-3 text-xl text-ink/80">Descarga nuestro menú de deliciosos platillos hasta tu habitación.</p>
            <ul className="mt-5 space-y-2 text-ink/80">
              <li className="flex items-center gap-2">
                <ConciergeBell className="size-5 text-rust" aria-hidden="true" /> Servicio a la habitación
              </li>
              <li className="flex items-center gap-2">
                <Coffee className="size-5 text-rust" aria-hidden="true" /> Desayuno {mxn(breakfastPrice)} por persona
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={site.menuPdf}
                download
                className="inline-flex items-center gap-2 rounded-lg bg-rust px-6 py-3 font-heavy text-lg font-extrabold text-white shadow hover:bg-rust-dark"
              >
                <Download className="size-5" aria-hidden="true" /> Descargar
              </a>
              <a
                href={site.menuPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-teal px-6 py-2.5 font-bold text-teal hover:bg-teal hover:text-white"
              >
                Ver en línea
              </a>
              <a
                href={whatsappUrl("Hola, quiero hacer un pedido del restaurante.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25d366] px-6 py-3 font-bold text-white hover:brightness-95"
              >
                <WhatsAppIcon className="size-5" /> Pedir
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/images/comida-desayuno-charola.jpg"
              alt="Desayuno servido en charola con café y el menú de Hacienda del Indio"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-sand py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl text-teal">Algunos de nuestros platillos</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {dishes.map((d) => (
              <div key={d.src} className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-md">
                <Image src={d.src} alt={d.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
