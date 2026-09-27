import { site } from "@/data/site";

export default function MapEmbed({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-sand-light shadow-lg ring-1 ring-black/5 ${className}`}>
      <iframe
        title={`Mapa: ${site.name}, ${site.address.full}`}
        src={site.mapEmbed}
        className="block aspect-[4/3] h-full w-full md:aspect-auto md:min-h-96"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
