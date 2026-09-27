import { breakfastPrice, extraPersonFee, promoMinNights, rooms, type Room } from "@/data/rooms";

export type Quote = {
  nights: number;
  lodging: number;
  extraGuests: number;
  extrasTotal: number;
  breakfastTotal: number;
  total: number;
  promoEligible: boolean;
  promoTotal: number;
};

/** Cálculo de tarifa compartido por el widget público y el servidor. */
export function quote(
  room: Room,
  opts: { nights: number; roomCount: number; guests: number; breakfast: boolean },
): Quote {
  const { nights, roomCount, guests, breakfast } = opts;
  const extraGuests = Math.max(0, guests - room.includedGuests * roomCount);
  const extrasTotal = extraGuests * extraPersonFee * nights;
  const breakfastTotal = breakfast ? guests * breakfastPrice * nights : 0;
  const lodging = room.price * roomCount * nights;
  const promoEligible = nights >= promoMinNights;
  return {
    nights,
    lodging,
    extraGuests,
    extrasTotal,
    breakfastTotal,
    total: lodging + extrasTotal + breakfastTotal,
    promoEligible,
    promoTotal: room.promoPrice * roomCount * nights + extrasTotal + breakfastTotal,
  };
}

export const roomBySlug = (slug: string) => rooms.find((r) => r.slug === slug);
