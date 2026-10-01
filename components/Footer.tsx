import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Mail, MessageCircle, Phone } from "lucide-react";
import { FacebookIcon, WhatsAppIcon } from "./BrandIcons";
import { site } from "@/data/site";

const channels = [
  {
    title: "Llamada",
    value: site.phone.display,
    icon: Phone,
    actions: [{ label: "Llamar", href: site.phone.href }],
  },
  {
    title: "WhatsApp",
    value: site.whatsapp.display,
    icon: WhatsAppIcon,
    actions: [{ label: "WhatsApp", href: site.whatsapp.link, external: true }],
  },
  {
    title: "Facebook",
    value: site.facebook.handle,
    icon: FacebookIcon,
    actions: [
      { label: "Messenger", href: site.facebook.messenger, external: true },
      { label: "Ver en Fb", href: site.facebook.url, external: true },
    ],
  },
  {
    title: "Quejas y sugerencias",
    value: site.complaintsEmail,
    icon: Mail,
    actions: [{ label: "Escribir", href: `mailto:${site.complaintsEmail}` }],
  },
];

export default function Footer() {
  return (
    <footer id="contacto" className="scroll-mt-16 bg-rust text-cream">
      <div className="tipi-divider bg-rust-dark/40" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <Image
            src="/images/logo-blanco.png"
            alt="Hacienda del Indio Hotel"
            width={900}
            height={878}
            className="mx-auto h-auto w-36 md:w-44"
          />
          <div className="text-center md:text-left">
            <h2 className="font-display text-4xl font-medium md:text-5xl">Más información</h2>
            <p className="font-display mt-2 text-xl text-cream/90 md:text-2xl">
              {site.name}. {site.address.full} México.
            </p>
            <p className="font-display text-lg text-cream/90 md:text-xl">
              Quejas y sugerencias:{" "}
              <a href={`mailto:${site.complaintsEmail}`} className="underline underline-offset-4 hover:text-white">
                {site.complaintsEmail}
              </a>
            </p>
          </div>
        </div>

        {/* Franja rápida como en el diseño: agenda · teléfono · WhatsApp · web */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-y border-cream/30 py-5">
          <Link
            href="/reservar"
            aria-label="Reservar en línea"
            className="grid size-14 place-items-center rounded-lg bg-orange text-rust shadow-inner transition-transform hover:scale-105"
          >
            <CalendarCheck className="size-8" strokeWidth={2.4} />
          </Link>
          <a href={site.phone.href} className="font-display text-3xl hover:text-white md:text-4xl">
            {site.phone.short}
          </a>
          <a
            href={site.whatsapp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display inline-flex items-center gap-2 text-3xl hover:text-white md:text-4xl"
          >
            <span className="grid size-8 place-items-center rounded-md bg-[#25d366] text-white">
              <WhatsAppIcon className="size-6" />
            </span>
            {site.whatsapp.short}
          </a>
          <span className="font-display text-3xl md:text-4xl">HaciendaDelIndioHotel.com</span>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ title, value, icon: Icon, actions }) => (
            <li key={title} className="rounded-xl bg-rust-dark/35 p-5">
              <div className="flex items-center gap-3">
                <Icon className="size-6 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold tracking-wide uppercase text-cream/80">{title}</p>
              </div>
              <p className="mt-2 font-heavy text-base font-extrabold break-all text-white xl:text-lg">{value}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((a) => (
                  <a
                    key={a.label}
                    href={a.href}
                    {...("external" in a && a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex items-center gap-1.5 rounded-md bg-cream px-3 py-1.5 text-sm font-bold text-rust transition-colors hover:bg-white"
                  >
                    {a.label === "Messenger" && <MessageCircle className="size-4" aria-hidden="true" />}
                    {a.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 text-sm text-cream/75 sm:flex-row">
          <p>
            © Todos los derechos {site.owner}. {new Date().getFullYear()}.
            <span className="mx-2 text-cream/40" aria-hidden="true">·</span>
            <Link href="/admin" rel="nofollow" className="underline-offset-4 hover:text-white hover:underline">
              Interno
            </Link>
          </p>
          <Image src="/images/isotipo-blanco.png" alt="" width={600} height={491} className="h-10 w-auto opacity-80" />
        </div>
      </div>
    </footer>
  );
}
