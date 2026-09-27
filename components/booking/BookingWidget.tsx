"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, CalendarDays, Check, Coffee, Minus, PawPrint, Phone, Plus, Users, X } from "lucide-react";
import RangeCalendar from "./RangeCalendar";
import { addDays, fmtLong, fmtShort, nightsBetween, startOfDay } from "./dates";
import { WhatsAppIcon } from "../BrandIcons";
import {
  blockedDates,
  breakfastPrice,
  extraPersonFee,
  mxn,
  promoMinNights,
  rooms,
  type Room,
} from "@/data/rooms";
import { site, whatsappUrl } from "@/data/site";

type Popover = "dates" | "guests" | null;
const MAX_ROOMS = 10;

export default function BookingWidget({ initialRoom = "doble" }: { initialRoom?: Room["slug"] }) {
  const [slug, setSlug] = useState<Room["slug"]>(initialRoom);
  const room = rooms.find((r) => r.slug === slug) ?? rooms[0];

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [roomCount, setRoomCount] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [breakfast, setBreakfast] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState<Popover>(null);
  const [touched, setTouched] = useState(false);
  const [wide, setWide] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const blocked = useMemo(() => new Set(blockedDates), []);

  // Fechas por defecto (hoy → mañana) solo en cliente para evitar desfaces de zona horaria en SSR
  useEffect(() => {
    const t = startOfDay(new Date());
    setCheckIn(t);
    setCheckOut(addDays(t, 1));
    const mq = window.matchMedia("(min-width: 768px)");
    setWide(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mantener huéspedes dentro de la capacidad
  const capacity = room.maxGuests * roomCount;
  const guests = adults + children;
  useEffect(() => {
    if (guests > capacity) {
      const a = Math.min(adults, capacity);
      setAdults(Math.max(1, a));
      setChildren(Math.max(0, capacity - Math.max(1, a)));
    }
    if (adults < roomCount) setAdults(roomCount);
  }, [capacity, guests, adults, roomCount]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const extraGuests = Math.max(0, guests - room.includedGuests * roomCount);
  const breakfastTotal = breakfast ? guests * breakfastPrice * nights : 0;
  const extrasTotal = extraGuests * extraPersonFee * nights;
  const lodging = room.price * roomCount * nights;
  const total = lodging + extrasTotal + breakfastTotal;
  const promoEligible = nights >= promoMinNights;
  const promoTotal = room.promoPrice * roomCount * nights + extrasTotal + breakfastTotal;

  const phoneDigits = phone.replace(/\D/g, "");
  const errors = {
    dates: nights < 1 ? "Selecciona fecha de entrada y salida." : "",
    name: name.trim().length < 2 ? "Escribe tu nombre." : "",
    phone: phoneDigits.length < 10 ? "Escribe un teléfono a 10 dígitos." : "",
  };
  const valid = !errors.dates && !errors.name && !errors.phone;

  const guestLabel = `${adults} adulto${adults !== 1 ? "s" : ""}${
    children ? `, ${children} niño${children !== 1 ? "s" : ""}` : ""
  }`;

  const message = () =>
    [
      "Hola, quiero solicitar una reservación en Hacienda del Indio:",
      `• Habitación: ${room.name}${roomCount > 1 ? ` (x${roomCount})` : ""}`,
      `• Entrada: ${checkIn ? fmtLong(checkIn) : "-"}`,
      `• Salida: ${checkOut ? fmtLong(checkOut) : "-"} (${nights} noche${nights !== 1 ? "s" : ""})`,
      `• Huéspedes: ${guestLabel}`,
      `• Desayuno: ${breakfast ? "Sí" : "No"}`,
      `• Total estimado: ${mxn(total)} M.N.`,
      promoEligible ? `• Me interesa la tarifa promo pagando por adelantado: ${mxn(promoTotal)} M.N.` : "",
      "",
      `Nombre: ${name.trim()}`,
      `Teléfono: ${phone.trim()}`,
      notes.trim() ? `Comentarios: ${notes.trim()}` : "",
    ]
      .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""))
      .join("\n");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    window.open(whatsappUrl(message()), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="overflow-visible rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* Foto de cabecera */}
      <div className="relative h-44 overflow-hidden rounded-t-2xl sm:h-60">
        <Image
          src="/images/zona-fachada-palmeras.jpg"
          alt="Fachada de Hacienda del Indio con palmeras y arcos"
          fill
          sizes="(min-width: 1024px) 896px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-xs shadow">
          <p className="font-extrabold text-teal">Reserva directa con el hotel</p>
          <p className="text-ink/70">Confirmamos por WhatsApp o teléfono</p>
        </div>
        <h2 className="absolute bottom-10 left-4 font-display text-3xl text-white drop-shadow sm:text-4xl">
          Reserva tu estancia
        </h2>
      </div>

      <form onSubmit={submit} noValidate>
        {/* Barra de búsqueda */}
        <div ref={boxRef} className="relative z-20 -mt-6 px-3 sm:px-6">
          <div className="grid gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10 md:grid-cols-[1.3fr_1fr]">
            <fieldset className="rounded-lg border-2 border-ink/25 px-3 pb-2 focus-within:border-teal">
              <legend className="px-1 text-xs font-semibold text-ink/70">Fechas de estancia</legend>
              <button
                type="button"
                onClick={() => setOpen(open === "dates" ? null : "dates")}
                aria-expanded={open === "dates"}
                className="flex w-full items-center gap-2 text-left text-sm font-semibold text-ink"
              >
                <CalendarDays className="size-5 shrink-0 text-teal" aria-hidden="true" />
                <span className="truncate">
                  {checkIn ? fmtShort(checkIn) : "Entrada"} <span className="text-ink/40">→</span>{" "}
                  {checkOut ? fmtShort(checkOut) : "Salida"}
                </span>
                {nights > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-teal-light px-2 py-0.5 text-xs font-bold text-teal">
                    {nights} noche{nights !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            </fieldset>

            <fieldset className="rounded-lg border-2 border-ink/25 px-3 pb-2 focus-within:border-teal">
              <legend className="px-1 text-xs font-semibold text-ink/70">Habitación y huéspedes</legend>
              <button
                type="button"
                onClick={() => setOpen(open === "guests" ? null : "guests")}
                aria-expanded={open === "guests"}
                className="flex w-full items-center gap-2 text-left text-sm font-semibold text-ink"
              >
                <Users className="size-5 shrink-0 text-teal" aria-hidden="true" />
                <span className="truncate">
                  {room.cardName}
                  {roomCount > 1 ? ` x${roomCount}` : ""} · {guestLabel}
                </span>
              </button>
            </fieldset>
          </div>

          {open === "dates" && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 sm:inset-x-6 md:left-auto md:w-[640px]">
              <div className="rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/10 sm:p-5">
                <RangeCalendar
                  checkIn={checkIn}
                  checkOut={checkOut}
                  blocked={blocked}
                  months={wide ? 2 : 1}
                  onChange={(a, b) => {
                    setCheckIn(a);
                    setCheckOut(b);
                    if (a && b) setOpen(null);
                  }}
                />
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-sm">
                  <p className="text-ink/70">
                    {!checkIn
                      ? "Elige tu fecha de entrada"
                      : !checkOut
                        ? "Ahora elige tu fecha de salida"
                        : `${nights} noche${nights !== 1 ? "s" : ""} seleccionada${nights !== 1 ? "s" : ""}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="rounded-md bg-teal px-4 py-1.5 font-bold text-white hover:bg-teal-dark"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}

          {open === "guests" && (
            <div className="absolute inset-x-3 top-full z-30 mt-2 sm:inset-x-6 md:left-auto md:w-[420px]">
              <div className="rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/10 sm:p-5">
                <p className="text-xs font-bold tracking-wider text-ink/60 uppercase">Tipo de habitación</p>
                <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Tipo de habitación">
                  {rooms.map((r) => (
                    <button
                      key={r.slug}
                      type="button"
                      role="radio"
                      aria-checked={r.slug === slug}
                      onClick={() => setSlug(r.slug)}
                      className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors ${
                        r.slug === slug ? "border-teal bg-teal-light" : "border-black/10 hover:border-teal/50"
                      }`}
                    >
                      <span>
                        <span className="block font-bold text-ink">{r.name}</span>
                        <span className="text-xs text-ink/65">{r.capacity}</span>
                      </span>
                      <span className="font-heavy font-extrabold text-rust">{mxn(r.price)}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <Stepper label="Habitaciones" hint="Ideal para equipos de trabajo" value={roomCount} min={1} max={MAX_ROOMS} onChange={setRoomCount} />
                  <Stepper label="Adultos" value={adults} min={roomCount} max={capacity - children} onChange={setAdults} />
                  <Stepper label="Niños" value={children} min={0} max={capacity - adults} onChange={setChildren} />
                </div>
                <p className="mt-3 text-xs text-ink/65">
                  Capacidad máxima: {capacity} persona{capacity !== 1 ? "s" : ""}. Persona adicional: +{mxn(extraPersonFee)} por noche.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="mt-4 w-full rounded-md bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-dark"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>
        {touched && errors.dates && <p className="px-6 pt-2 text-sm font-semibold text-rust">{errors.dates}</p>}

        {/* Cuerpo: habitación elegida + resumen */}
        <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image src={room.images[0].src} alt={room.images[0].alt} fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" />
              <span className="absolute top-3 left-3 rounded-md bg-teal px-3 py-1 font-heavy text-xs font-extrabold tracking-wider text-white uppercase">
                {room.cardName}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Elige habitación">
              {rooms.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  role="radio"
                  aria-checked={r.slug === slug}
                  onClick={() => setSlug(r.slug)}
                  className={`rounded-lg border-2 px-2 py-2 text-center transition-colors ${
                    r.slug === slug ? "border-teal bg-teal text-white" : "border-black/10 text-ink hover:border-teal/60"
                  }`}
                >
                  <span className="block text-xs font-bold uppercase">{r.cardName}</span>
                  <span className="block font-heavy text-sm font-extrabold">{mxn(r.price)}</span>
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
              <li className="flex items-center gap-2">
                <BedDouble className="size-4 text-rust" aria-hidden="true" /> {room.capacity}
              </li>
              <li className="flex items-center gap-2">
                <PawPrint className="size-4 text-rust" aria-hidden="true" /> No se admiten mascotas
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h3 className="font-display text-2xl text-teal">Resumen de tu estancia</h3>
            {nights > 0 ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Row
                  label={`${mxn(room.price)} x ${nights} noche${nights !== 1 ? "s" : ""}${roomCount > 1 ? ` x ${roomCount} hab.` : ""}`}
                  value={mxn(lodging)}
                />
                {extraGuests > 0 && (
                  <Row label={`Persona adicional (${extraGuests}) x ${nights} noche${nights !== 1 ? "s" : ""}`} value={mxn(extrasTotal)} />
                )}
                {breakfast && <Row label={`Desayuno (${guests}) x ${nights} día${nights !== 1 ? "s" : ""}`} value={mxn(breakfastTotal)} />}
                <div className="flex items-baseline justify-between border-t border-black/10 pt-2">
                  <dt className="font-bold">Total estimado</dt>
                  <dd className="font-heavy text-2xl font-black text-rust">
                    {mxn(total)} <span className="text-xs font-bold text-ink/60">M.N.</span>
                  </dd>
                </div>
                {promoEligible && (
                  <div className="rounded-lg bg-orange/15 px-3 py-2 text-ink">
                    <p className="font-bold text-rust-dark">
                      Tarifa promo {promoMinNights}+ noches: {mxn(promoTotal)}
                    </p>
                    <p className="text-xs text-ink/70">
                      {mxn(room.promoPrice)} por noche al pagar por adelantado. Aplican restricciones.
                    </p>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 rounded-lg bg-sand-light p-3 text-sm text-ink/70">Elige tus fechas para ver el total.</p>
            )}

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-black/10 px-3 py-2 text-sm has-[:checked]:border-orange has-[:checked]:bg-orange/10">
              <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} className="size-4 accent-rust" />
              <Coffee className="size-5 text-rust" aria-hidden="true" />
              <span>
                <span className="font-bold">Agregar desayuno</span>{" "}
                <span className="text-ink/65">{mxn(breakfastPrice)} por persona, por día</span>
              </span>
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" error={touched ? errors.name : ""}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Tu nombre"
                />
              </Field>
              <Field label="Teléfono" error={touched ? errors.phone : ""}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="686 000 0000"
                />
              </Field>
            </div>
            <Field label="Comentarios (opcional)" className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-none bg-transparent text-sm outline-none"
                placeholder="Hora de llegada, factura, cuadrilla de trabajo…"
              />
            </Field>

            <button
              type="submit"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-rust px-5 py-3 font-heavy text-base font-extrabold text-white shadow-md transition-colors hover:bg-rust-dark"
            >
              <WhatsAppIcon className="size-5" />
              Solicitar reservación
            </button>
            <a
              href={site.phone.href}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-teal px-5 py-2.5 text-sm font-bold text-teal hover:bg-teal hover:text-white"
            >
              <Phone className="size-4" aria-hidden="true" /> O llámanos al {site.phone.display}
            </a>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink/60">
              <Check className="mt-0.5 size-3.5 shrink-0 text-teal" aria-hidden="true" />
              Tu solicitud se envía por WhatsApp a recepción. La reservación queda confirmada cuando el hotel
              verifica disponibilidad. Precios en pesos mexicanos (M.N.).
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink/75">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        className={`block rounded-lg border-2 px-3 pt-1 pb-2 focus-within:border-teal ${error ? "border-rust" : "border-ink/20"}`}
      >
        <span className="block text-xs font-semibold text-ink/65">{label}</span>
        {children}
      </label>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rust">
          <X className="size-3" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-xs text-ink/60">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Menos ${label.toLowerCase()}`}
          className="grid size-8 place-items-center rounded-full border-2 border-teal text-teal disabled:border-black/15 disabled:text-black/25"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center font-bold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Más ${label.toLowerCase()}`}
          className="grid size-8 place-items-center rounded-full border-2 border-teal text-teal disabled:border-black/15 disabled:text-black/25"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
