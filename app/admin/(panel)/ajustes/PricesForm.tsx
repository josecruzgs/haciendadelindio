"use client";

import { useActionState, useState } from "react";
import { savePrices } from "@/lib/actions/admin";
import { DEFAULT_PRICING, mxn, promoNightly, rooms, type Pricing, type PromoSettings } from "@/data/rooms";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal disabled:bg-sand-light disabled:text-ink/50";

function Money({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: number;
  onChange?: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-ink/65">
      {label}
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-sm text-ink/50">$</span>
        <input
          name={disabled ? undefined : name}
          type="number"
          min={0}
          max={100000}
          step={1}
          required={!disabled}
          disabled={disabled}
          {...(onChange ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value)) } : { defaultValue: value })}
          className={`${input} pl-6`}
        />
      </span>
    </label>
  );
}

export default function PricesForm({ pricing }: { pricing: Pricing }) {
  const [state, action, pending] = useActionState(savePrices, undefined);
  const [prices, setPrices] = useState(pricing.rooms);
  const [promo, setPromo] = useState<PromoSettings>(pricing.promo);
  const setRoom = (slug: keyof Pricing["rooms"], k: "price" | "promoPrice") => (n: number) =>
    setPrices((p) => ({ ...p, [slug]: { ...p[slug], [k]: n } }));

  return (
    <form action={action} className="mt-4 space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-88 text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/55">
              <th className="pb-1 font-semibold">Habitación</th>
              <th className="pb-1 font-semibold">Por noche</th>
              <th className="pb-1 font-semibold">Precio promo</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.slug}>
                <td className="py-1.5 pr-3 font-bold">{r.name}</td>
                <td className="py-1.5 pr-2">
                  <Money name={`${r.slug}_price`} label="" value={prices[r.slug].price} onChange={setRoom(r.slug, "price")} />
                </td>
                <td className="py-1.5">
                  {/* Con descuento en %, el precio promo se calcula; se envía el guardado para no perderlo */}
                  {promo.type === "porcentaje" && <input type="hidden" name={`${r.slug}_promo`} value={prices[r.slug].promoPrice} />}
                  <Money
                    name={`${r.slug}_promo`}
                    label=""
                    value={promo.type === "porcentaje" ? promoNightly(prices[r.slug].price, 0, promo) : prices[r.slug].promoPrice}
                    onChange={setRoom(r.slug, "promoPrice")}
                    disabled={promo.type === "porcentaje" || !promo.enabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!promo.enabled && rooms.map((r) => <input key={r.slug} type="hidden" name={`${r.slug}_promo`} value={prices[r.slug].promoPrice} />)}

      <div className="grid gap-3 sm:grid-cols-2">
        <Money name="breakfastPrice" label="Desayuno (por persona, por día)" value={pricing.breakfastPrice} />
        <Money name="extraPersonFee" label="Persona adicional (por noche)" value={pricing.extraPersonFee} />
      </div>

      <fieldset className="rounded-xl bg-sand-light/70 p-4">
        <legend className="sr-only">Promoción por pago anticipado</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            name="promo_enabled"
            type="checkbox"
            checked={promo.enabled}
            onChange={(e) => setPromo({ ...promo, enabled: e.target.checked })}
            className="mt-0.5 size-4 accent-teal"
          />
          <span>
            <span className="font-bold">Promoción por pago anticipado</span>
            <span className="block text-xs text-ink/60">
              Se aplica cuando el huésped paga en línea con la liga de Stripe y su estancia alcanza las noches mínimas.
            </span>
          </span>
        </label>

        <div className={`mt-3 grid gap-3 sm:grid-cols-2 ${promo.enabled ? "" : "pointer-events-none opacity-50"}`}>
          <label className="block text-xs font-semibold text-ink/65">
            Noches mínimas
            <input
              name="promo_min_nights"
              type="number"
              min={1}
              max={30}
              required
              value={promo.minNights}
              onChange={(e) => setPromo({ ...promo, minNights: Number(e.target.value) })}
              className={input}
            />
          </label>
          <div className="text-xs font-semibold text-ink/65">
            Tipo de descuento
            <div className="mt-1 grid gap-1.5">
              <label className="flex items-center gap-2 font-normal text-ink/80">
                <input
                  type="radio"
                  name="promo_type"
                  value="precio"
                  checked={promo.type === "precio"}
                  onChange={() => setPromo({ ...promo, type: "precio" })}
                  className="accent-teal"
                />
                Precio promo por habitación (tabla)
              </label>
              <label className="flex items-center gap-2 font-normal text-ink/80">
                <input
                  type="radio"
                  name="promo_type"
                  value="porcentaje"
                  checked={promo.type === "porcentaje"}
                  onChange={() => setPromo({ ...promo, type: "porcentaje" })}
                  className="accent-teal"
                />
                % de descuento sobre la tarifa
              </label>
            </div>
          </div>
          {promo.type === "porcentaje" && (
            <label className="block text-xs font-semibold text-ink/65">
              Descuento (%)
              <input
                name="promo_percent"
                type="number"
                min={1}
                max={90}
                required
                value={promo.percent}
                onChange={(e) => setPromo({ ...promo, percent: Number(e.target.value) })}
                className={input}
              />
            </label>
          )}
        </div>
        {promo.type === "precio" && <input type="hidden" name="promo_percent" value={promo.percent} />}
        {promo.enabled && (
          <p className="mt-3 text-xs text-ink/65">
            Ejemplo: Doble {promo.minNights} noches = {mxn(prices.doble.price * promo.minNights)}; pagando en línea{" "}
            <strong>{mxn(promoNightly(prices.doble.price, prices.doble.promoPrice, promo) * promo.minNights)}</strong>.
          </p>
        )}
      </fieldset>

      <p className="text-xs text-ink/55">
        Los cambios se ven de inmediato en el sitio y aplican a reservaciones nuevas; las ya registradas conservan su total.
        Originales: Sencilla {mxn(DEFAULT_PRICING.rooms.sencilla.price)}, Doble {mxn(DEFAULT_PRICING.rooms.doble.price)}, Triple{" "}
        {mxn(DEFAULT_PRICING.rooms.triple.price)}, desayuno {mxn(DEFAULT_PRICING.breakfastPrice)}, promo{" "}
        {DEFAULT_PRICING.promo.minNights}+ noches.
      </p>
      {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar precios y promoción"}
      </button>
    </form>
  );
}
