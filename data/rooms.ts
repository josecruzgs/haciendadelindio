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
  /** Tarifa promocional al pagar 3 noches o más por adelantado. */
  promoPrice: number;
  metaDescription: string;
  images: RoomImage[];
};

export const extraPersonFee = 200; // MXN por persona, por noche
export const breakfastPrice = 75; // MXN por persona
export const promoMinNights = 3;
export const petsAllowed = false;

/**
 * Fechas sin disponibilidad (YYYY-MM-DD). Aparecen tachadas en el calendario de reservación.
 * Se pueden conectar más adelante a un PMS / channel manager.
 */
export const blockedDates: string[] = [];

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
      { src: "/images/hab-doble-camas.jpg", alt: "Dos camas con colchas rojas en la habitación doble con aire acondicionado" },
      { src: "/images/hab-doble-frontal.jpg", alt: "Vista frontal de las dos camas matrimoniales de la habitación doble" },
      { src: "/images/hab-toallas-espejo.jpg", alt: "Toallas bordadas con el logotipo del hotel frente al espejo" },
      { src: "/images/zona-llave-habitacion.jpg", alt: "Llave de habitación con llavero de Hacienda del Indio" },
      { src: "/images/zona-toallas-logo.jpg", alt: "Toallas blancas con el logotipo bordado y amenidades de baño" },
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
      { src: "/images/hab-triple-camas.jpg", alt: "Camas matrimoniales de la habitación triple con muro turquesa" },
      { src: "/images/hab-triple-vista-amplia.jpg", alt: "Vista amplia de la habitación triple con tres camas y clóset" },
      { src: "/images/hab-triple-escritorio.jpg", alt: "Habitación triple con escritorio, televisión y aire acondicionado" },
      { src: "/images/hab-triple-bano-acceso.jpg", alt: "Acceso al baño privado de la habitación triple" },
      { src: "/images/hab-triple-regadera.jpg", alt: "Baño con regadera y lavabo de la habitación triple" },
    ],
  },
];

export function getRoom(slug: string) {
  return rooms.find((r) => r.slug === slug);
}

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
