import "server-only";
import { connection } from "next/server";
import { DEFAULT_PRICING, withPricing, type Pricing, type Room } from "@/data/rooms";
import { query } from "./db";

/**
 * Precios vigentes (habitaciones, desayuno, persona adicional) guardados desde /admin/ajustes.
 * Se guardan en la tabla `settings` (clave "prices") y se cachean en memoria unos segundos.
 */

const TTL_MS = 30_000;
type Holder = { value?: Pricing; at?: number };
const g = globalThis as typeof globalThis & { __hdiPricing?: Holder };
const holder: Holder = (g.__hdiPricing ??= {});

function merge(saved: Partial<Pricing> | null): Pricing {
  if (!saved) return DEFAULT_PRICING;
  return {
    rooms: Object.fromEntries(
      Object.entries(DEFAULT_PRICING.rooms).map(([slug, d]) => [slug, { ...d, ...saved.rooms?.[slug as Room["slug"]] }]),
    ) as Pricing["rooms"],
    breakfastPrice: saved.breakfastPrice ?? DEFAULT_PRICING.breakfastPrice,
    extraPersonFee: saved.extraPersonFee ?? DEFAULT_PRICING.extraPersonFee,
    promo: { ...DEFAULT_PRICING.promo, ...saved.promo },
  };
}

export async function getPricing(): Promise<Pricing> {
  await connection(); // los precios se leen en cada petición, no al compilar
  if (holder.value && Date.now() - (holder.at ?? 0) < TTL_MS) return holder.value;
  try {
    const [row] = await query<{ value: string }>(`SELECT value FROM settings WHERE key = 'prices'`);
    holder.value = merge(row ? (JSON.parse(row.value) as Partial<Pricing>) : null);
    holder.at = Date.now();
    return holder.value;
  } catch (e) {
    console.error("[precios] no se pudieron leer; se usan los precios por defecto", e);
    return holder.value ?? DEFAULT_PRICING;
  }
}

export async function savePricing(p: Pricing) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('prices', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(p)],
  );
  holder.value = p;
  holder.at = Date.now();
}

/** Habitaciones con los precios vigentes. */
export const getRooms = async () => withPricing(await getPricing());

export async function getPricedRoom(slug: string) {
  return (await getRooms()).find((r) => r.slug === slug);
}
