import { WhatsAppIcon } from "./BrandIcons";
import { site, whatsappUrl } from "@/data/site";

export default function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl("Hola, me gustaría información para reservar en Hacienda del Indio.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escríbenos por WhatsApp al ${site.whatsapp.display}`}
      className="group fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full bg-[#25d366] p-3.5 text-white shadow-lg shadow-black/25 transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
      <span className="hidden pr-1 text-sm font-bold group-hover:inline">WhatsApp</span>
    </a>
  );
}
