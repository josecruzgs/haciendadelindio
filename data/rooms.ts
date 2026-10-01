export type RoomImage = { src: string; alt: string };

export type Room = {
  slug: "sencilla" | "doble" | "triple";
  name: string;
  cardName: string;
  capacity: string;
  beds: string;
  maxGuests: number;
  /** Huéspedes incluidos en la tarifa base; a partir de ahí aplica `extraPersonFee`. */
  includedGuests: number;
  price: number;
  /** Tarifa promo por noche al pagar en línea por adelantado (ver `Pricing.promo`). */
  promoPrice: number;
  metaDescription: string;
  images: RoomImage[];
};

// Precios por defecto; los vigentes se editan en /admin/ajustes (ver lib/catalog.ts)
export const extraPersonFee = 200; // MXN por persona, por noche
export const breakfastPrice = 75; // MXN por persona
export const promoMinNights = 3;
export const petsAllowed = false;

const metaTail =
  "Hacienda del Indio es un Hotel enfocado a brindar el descanso que tu y tu equipo de trabajo o familia necesitan.";

export const rooms: Room[] = [
  {
    slug: "sencilla",
    name: "Habitación Sencilla",
    cardName: "Estándar",
    capacity: "1 recámara, hasta 2 personas",
    beds: "1 cama",
    maxGuests: 2,
    includedGuests: 2,
    price: 849,
    promoPrice: 799,
    metaDescription: `Habitación sencilla para hasta 2 personas. ${metaTail}`,
    images: [
      { src: "/images/hab-sencilla-cama.jpg", alt: "Cama matrimonial con colcha roja y blanca en la habitación sencilla" },
      { src: "/images/hab-sencilla-muro-teal.jpg", alt: "Habitación sencilla con muro turquesa, buró y ventana" },
      { src: "/images/hab-sencilla-frontal.jpg", alt: "Vista frontal de la cama con cabecera de madera y almohadas con logotipo" },
      { src: "/images/hab-toallas-espejo.jpg", alt: "Toallas bordadas con el logotipo del hotel frente al espejo" },
      { src: "/images/zona-llave-habitacion.jpg", alt: "Llave de la habitación 15 con llavero de Hacienda del Indio" },
      { src: "/images/zona-toallas-logo.jpg", alt: "Toallas blancas con el logotipo bordado y amenidades de baño" },
    ],
  },
  {
    slug: "doble",
    name: "Habitación Doble",
    cardName: "Doble",
    capacity: "2 camas, hasta 4 personas",
    beds: "2 camas",
    maxGuests: 4,
    includedGuests: 2,
    price: 999,
    promoPrice: 949,
    metaDescription: `Habitación doble para hasta 4 personas. ${metaTail}`,
    images: [
      { src: "/images/habitacion-doble-camas.jpg", alt: "Dos camas matrimoniales de la habitación doble con muro turquesa" },
      { src: "/images/habitacion-doble-vista-amplia.jpg", alt: "Vista amplia de la habitación doble con clóset" },
      { src: "/images/habitacion-doble-escritorio.jpg", alt: "Habitación doble con escritorio, televisión y aire acondicionado" },
      { src: "/images/habitacion-doble-bano-acceso.jpg", alt: "Acceso al baño privado de la habitación doble" },
      { src: "/images/habitacion-doble-regadera.jpg", alt: "Baño con regadera y lavabo de la habitación doble" },
    ],
  },
  {
    slug: "triple",
    name: "Habitación Triple",
    cardName: "Triple",
    capacity: "3 camas, hasta 6 personas",
    beds: "3 camas",
    maxGuests: 6,
    includedGuests: 2,
    price: 1099,
    promoPrice: 1049,
    metaDescription: `Habitación triple para hasta 6 personas. ${metaTail}`,
    images: [
      { src: "/images/habitacion-triple-camas.jpg", alt: "Tres camas con colchas rojas en la habitación triple con aire acondicionado" },
      { src: "/images/habitacion-triple-frontal.jpg", alt: "Vista frontal de las camas matrimoniales de la habitación triple" },
      { src: "/images/hab-toallas-espejo.jpg", alt: "Toallas bordadas con el logotipo del hotel frente al espejo" },
      { src: "/images/zona-llave-habitacion.jpg", alt: "Llave de habitación con llavero de Hacienda del Indio" },
      { src: "/images/zona-toallas-logo.jpg", alt: "Toallas blancas con el logotipo bordado y amenidades de baño" },
    ],
  },
];

/** Promoción por pago anticipado en línea (Stripe). */
export type PromoSettings = {
  enabled: boolean;
  /** Noches mínimas para que aplique. */
  minNights: number;
  /** precio = `promoPrice` de cada habitación; porcentaje = `percent` % menos sobre la tarifa por noche. */
  type: "precio" | "porcentaje";
  percent: number;
};

/** Precios editables desde el panel. */
export type Pricing = {
  rooms: Record<Room["slug"], { price: number; promoPrice: number }>;
  breakfastPrice: number;
  extraPersonFee: number;
  promo: PromoSettings;
};

export const DEFAULT_PRICING: Pricing = {
  rooms: Object.fromEntries(rooms.map((r) => [r.slug, { price: r.price, promoPrice: r.promoPrice }])) as Pricing["rooms"],
  breakfastPrice,
  extraPersonFee,
  promo: { enabled: true, minNights: promoMinNights, type: "precio", percent: 5 },
};

/** Precio promo por noche según el tipo de promoción. */
export const promoNightly = (price: number, roomPromoPrice: number, promo: PromoSettings) =>
  promo.type === "porcentaje" ? Math.round(price * (1 - Math.min(90, Math.max(0, promo.percent)) / 100)) : roomPromoPrice;

/** Habitaciones con los precios vigentes (`promoPrice` ya es la tarifa promo efectiva). */
export const withPricing = (p: Pricing): Room[] =>
  rooms.map((r) => {
    const { price, promoPrice } = p.rooms[r.slug];
    return { ...r, price, promoPrice: promoNightly(price, promoPrice, p.promo) };
  });

/** "Promo 3+ noches" o null si la promoción está apagada. */
export const promoLabel = (p: Pricing) => (p.promo.enabled ? `Promo ${p.promo.minNights}+ noches` : null);

export function getRoom(slug: string) {
  return rooms.find((r) => r.slug === slug);
}

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
