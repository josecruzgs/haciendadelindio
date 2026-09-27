export const site = {
  name: "Hacienda del Indio Hotel",
  shortName: "Hacienda del Indio",
  url: "https://www.haciendadelindiohotel.com",
  tagline: "Descanso y Comodidad para tu tribu.",
  description:
    "Hacienda del Indio es un Hotel enfocado a brindar el descanso que tu y tu equipo de trabajo o familia necesitan. Contamos con todo tipo de habitaciones y servicios que asegurarán el descanso de los tuyos.",
  owner: "Grupo VB",
  address: {
    street: "Blvd. López Mateos",
    neighborhood: "Zona Urbana Zacatecas",
    postalCode: "21070",
    city: "Mexicali",
    region: "B.C.",
    regionFull: "Baja California",
    country: "MX",
    full: "Blvd. López Mateos, Zona Urbana Zacatecas, 21070 Mexicali, B.C.",
  },
  phone: {
    display: "(686) 557-2277",
    short: "686 557 2277",
    href: "tel:+526865572277",
    e164: "+526865572277",
  },
  whatsapp: {
    display: "(686) 335-0571",
    short: "686 335 0571",
    number: "526863350571",
    link: "https://wa.link/eeb0sw",
  },
  facebook: {
    handle: "/Haciendadelindiohotel",
    url: "https://fb.com/Haciendadelindiohotel",
    messenger: "https://m.me/Haciendadelindiohotel",
  },
  complaintsEmail: "aud.hoteles@outlook.com",
  menuPdf: "/menu-hacienda-del-indio.pdf",
  mapEmbed: "https://www.google.com/maps?q=Hacienda+del+Indio+Hotel+Mexicali&output=embed",
  mapLink: "https://www.google.com/maps/search/?api=1&query=Hacienda+del+Indio+Hotel+Mexicali",
} as const;

/** Liga de WhatsApp con mensaje prellenado. */
export function whatsappUrl(text?: string) {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
