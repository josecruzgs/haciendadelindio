"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MainNav from "./MainNav";

/**
 * Encabezado de marca: franja teal con montañas, "Comodidad | logo | y cercanía"
 * y, debajo, la barra de navegación fija.
 */
export default function Header() {
  const compact = usePathname() !== "/";
  return (
    <>
      <header className="mountains relative overflow-hidden">
        <div
          className={`mx-auto flex max-w-5xl items-end justify-center gap-3 px-4 sm:gap-6 ${
            compact ? "pt-4" : "pt-6 sm:pt-8"
          }`}
        >
          <p
            className={`font-display hidden flex-1 pb-[18%] text-right font-medium tracking-tight text-cream sm:block ${
              compact ? "text-3xl md:text-4xl" : "text-4xl md:text-6xl"
            }`}
          >
            Comodidad
          </p>

          <Link
            href="/"
            aria-label="Hacienda del Indio Hotel — inicio"
            className={`relative block shrink-0 ${compact ? "w-44 sm:w-56" : "w-56 sm:w-72 md:w-80"}`}
          >
            {/* Triángulo naranja detrás del logotipo */}
            <span
              aria-hidden="true"
              className="absolute inset-x-[-18%] bottom-0 top-[30%] bg-orange [clip-path:polygon(50%_0,100%_100%,0_100%)]"
            />
            <Image
              src="/images/hero-isotipo.png"
              alt=""
              width={700}
              height={573}
              priority
              className="relative mx-auto w-[82%]"
            />
            <Image
              src="/images/hero-wordmark.png"
              alt="Hacienda del Indio Hotel"
              width={900}
              height={286}
              priority
              className="relative mx-auto -mt-[4%] w-[86%] pb-2"
            />
          </Link>

          <p
            className={`font-display hidden flex-1 pb-[18%] font-medium tracking-tight text-cream sm:block ${
              compact ? "text-3xl md:text-4xl" : "text-4xl md:text-6xl"
            }`}
          >
            y cercanía
          </p>
        </div>
        <p className="font-display pb-3 text-center text-2xl text-cream sm:hidden">Comodidad y cercanía</p>
      </header>
      <MainNav />
    </>
  );
}
