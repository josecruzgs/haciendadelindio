"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, CalendarCheck, CalendarDays, Check, Clock, Coffee, CreditCard, LoaderCircle, Minus, PawPrint, Pencil, Phone, Plus, Users, X } from "lucide-react";
import RangeCalendar from "./RangeCalendar";
import { addDays, fmtLong, fmtShort, nightsBetween, startOfDay, toKey } from "./dates";
import { WhatsAppIcon } from "../BrandIcons";
import { breakfastPrice, extraPersonFee, mxn, promoMinNights, rooms, type Room } from "@/data/rooms";
import { site, whatsappUrl } from "@/data/site";
import { quote } from "@/lib/pricing";
import { createReservation } from "@/lib/actions/public";

type Popover = "dates" | "guests" | null;
type Channel = "directa" | "whatsapp";
const MAX_ROOMS = 10;

export default function BookingWidget({ initialRoom = "doble" }: { initialRoom?: Room["slug"] }) {
  const [slug, setSlug] = useState<Room["slug"]>(initialRoom);
  const room = rooms.find((r) => r.slug === slug) ?? rooms[0];

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [roomCount, setRoomCount] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [breakfasts, setBreakfasts] = useState(0); // desayunos por día
  const [breakfastModal, setBreakfastModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState<Popover>(null);
  const [touched, setTouched] = useState(false);
  const [wide, setWide] = useState(false);
  const [website, setWebsite] = useState(""); // campo trampa anti-spam
  const [serverError, setServerError] = useState("");
  const [sending, setSendingMode] = useState<Channel | null>(null);
  const [sent, setSent] = useState<{ code: string; url: string; channel: Channel } | null>(null);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});

  const boxRef = useRef<HTMLDivElement>(null);
  // Noches sin disponibilidad: bloqueos generales + los de la habitación elegida
  const blocked = useMemo(
    () => new Set([...(availability.all ?? []), ...(availability[slug] ?? [])]),
    [availability, slug],
  );

  useEffect(() => {
    fetch("/api/disponibilidad")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setAvailability)
      .catch(() => {});
  }, []);

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
  // No más desayunos que huéspedes
  useEffect(() => {
    if (breakfasts > guests) setBreakfasts(guests);
  }, [breakfasts, guests]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const { extraGuests, breakfastTotal, extrasTotal, lodging, total, promoEligible, promoTotal } = quote(room, {
    nights,
    roomCount,
    guests,
    breakfasts,
  });

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

  const message = (code?: string) =>
    [
      `Hola, quiero solicitar una reservación en Hacienda del Indio${code ? ` (folio ${code})` : ""}:`,
      `• Habitación: ${room.name}${roomCount > 1 ? ` (x${roomCount})` : ""}`,
      `• Entrada: ${checkIn ? fmtLong(checkIn) : "-"}`,
      `• Salida: ${checkOut ? fmtLong(checkOut) : "-"} (${nights} noche${nights !== 1 ? "s" : ""})`,
      `• Huéspedes: ${guestLabel}`,
      `• Desayuno: ${breakfasts ? `${breakfasts} por día` : "No"}`,
      `• Total estimado: ${mxn(total)} M.N.`,
      promoEligible ? `• Me interesa la tarifa promo pagando por adelantado: ${mxn(promoTotal)} M.N.` : "",
      "",
      `Nombre: ${name.trim()}`,
      `Teléfono: ${phone.trim()}`,
      notes.trim() ? `Comentarios: ${notes.trim()}` : "",
    ]
      .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""))
      .join("\n");

  /** "directa": se guarda y confirma en pantalla. "whatsapp": se guarda y además abre WhatsApp. */
  const submit = async (channel: Channel) => {
    setTouched(true);
    setServerError("");
    if (!valid || sending || !checkIn || !checkOut) return;

    // Para WhatsApp, abrir la pestaña dentro del clic (evita bloqueadores) y llenarla al guardar
    const tab = channel === "whatsapp" ? window.open("", "_blank") : null;
    if (tab) tab.opener = null;
    setSendingMode(channel);
    const res = await createReservation({
      channel,
      room: room.slug,
      rooms: roomCount,
      adults,
      children,
      checkIn: toKey(checkIn),
      checkOut: toKey(checkOut),
      breakfasts,
      name,
      phone,
      notes,
      website,
    }).catch(() => ({ ok: false as const, error: "Sin conexión.", retryable: true }));
    setSendingMode(null);

    if (channel === "directa") {
      if (!res.ok) {
        setServerError(
          res.retryable
            ? "No pudimos registrar tu reservación en este momento. Intenta de nuevo o envíala por WhatsApp."
            : res.error,
        );
        return;
      }
      setSent({ code: res.code, url: whatsappUrl(message(res.code)), channel });
      return;
    }

    if (!res.ok && !res.retryable) {
      tab?.close();
      setServerError(res.error);
      return;
    }
    // Si falló el guardado por un error técnico, la solicitud igual llega por WhatsApp
    const url = whatsappUrl(message(res.ok ? res.code : undefined));
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setSent({ code: res.ok ? res.code : "", url, channel });
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
          <p className="text-ink/70">Confirmamos y te enviamos tu link de pago</p>
        </div>
        <h2 className="absolute bottom-10 left-4 font-display text-3xl text-white drop-shadow sm:text-4xl">
          Reserva tu estancia
        </h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("directa");
        }}
        noValidate
      >
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

          {sent ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-teal-light p-6 text-center" role="status">
              <Clock className="size-12 text-teal" aria-hidden="true" />
              <h3 className="mt-3 font-display text-3xl text-teal">
                {sent.channel === "directa" ? "¡Tu reservación está en proceso!" : "¡Solicitud enviada!"}
              </h3>
              {sent.code && (
                <p className="mt-2 text-ink/80">
                  Tu folio es <strong className="font-heavy text-lg font-black text-rust">{sent.code}</strong>
                </p>
              )}
              {sent.channel === "directa" ? (
                <>
                  <p className="mt-2 max-w-sm text-sm font-semibold text-ink/80">
                    {room.name} · {checkIn && fmtShort(checkIn)} → {checkOut && fmtShort(checkOut)} · {mxn(total)} M.N.
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-ink/75">
                    Recepción está revisando la disponibilidad. Una vez confirmada, te enviaremos por WhatsApp al{" "}
                    <strong>{phone}</strong> un link de pago para completar tu reservación.
                  </p>
                  <p className="mt-3 flex max-w-sm items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-left text-xs text-ink/70">
                    <CreditCard className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden="true" />
                    Tu reservación queda asegurada al realizar el pago. Guarda tu folio para cualquier aclaración.
                  </p>
                  <a
                    href={site.phone.href}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-teal px-5 py-2.5 text-sm font-bold text-teal hover:bg-teal hover:text-white"
                  >
                    <Phone className="size-4" aria-hidden="true" /> ¿Dudas? {site.phone.display}
                  </a>
                </>
              ) : (
                <>
                  <p className="mt-2 max-w-sm text-sm text-ink/75">
                    Abrimos WhatsApp con los datos de tu estancia. Envía el mensaje y, cuando recepción confirme la
                    disponibilidad, te enviaremos un link de pago para completar tu reservación.
                  </p>
                  <a
                    href={sent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#25d366] px-5 py-3 font-bold text-white hover:brightness-95"
                  >
                    <WhatsAppIcon className="size-5" /> Abrir WhatsApp de nuevo
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setTouched(false);
                }}
                className="mt-3 text-sm font-bold text-teal underline underline-offset-4"
              >
                Hacer otra reservación
              </button>
            </div>
          ) : (
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
                {breakfasts > 0 && (
                  <Row label={`Desayuno (${breakfasts}) x ${nights} día${nights !== 1 ? "s" : ""}`} value={mxn(breakfastTotal)} />
                )}
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

            {breakfasts > 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border-2 border-orange bg-orange/10 px-3 py-2 text-sm">
                <Coffee className="size-5 shrink-0 text-rust" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="font-bold">
                    {breakfasts} desayuno{breakfasts !== 1 ? "s" : ""} por día
                  </span>{" "}
                  <span className="text-ink/65">{mxn(breakfastPrice)} c/u</span>
                </span>
                <button
                  type="button"
                  onClick={() => setBreakfastModal(true)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-teal hover:bg-white"
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setBreakfasts(0)}
                  aria-label="Quitar desayuno"
                  className="grid size-7 place-items-center rounded-md text-rust hover:bg-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setBreakfastModal(true)}
                className="mt-4 flex w-full items-center gap-3 rounded-lg border-2 border-black/10 px-3 py-2 text-left text-sm hover:border-orange"
              >
                <Plus className="size-4 text-rust" aria-hidden="true" />
                <Coffee className="size-5 text-rust" aria-hidden="true" />
                <span>
                  <span className="font-bold">Agregar desayuno</span>{" "}
                  <span className="text-ink/65">{mxn(breakfastPrice)} por persona, por día</span>
                </span>
              </button>
            )}

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

            {/* Campo trampa: invisible para personas */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            {serverError && (
              <p className="mt-4 rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark" role="alert">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              disabled={sending !== null}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-rust px-5 py-3 font-heavy text-base font-extrabold text-white shadow-md transition-colors hover:bg-rust-dark disabled:opacity-70"
            >
              {sending === "directa" ? <LoaderCircle className="size-5 animate-spin" /> : <CalendarCheck className="size-5" />}
              {sending === "directa" ? "Reservando…" : "Reservar ahora"}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => submit("whatsapp")}
                disabled={sending !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#25d366] px-3 py-2.5 text-sm font-bold text-[#128c4a] hover:bg-[#25d366] hover:text-white disabled:opacity-60"
              >
                {sending === "whatsapp" ? <LoaderCircle className="size-4 animate-spin" /> : <WhatsAppIcon className="size-4" />}
                Por WhatsApp
              </button>
              <a
                href={site.phone.href}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-teal px-3 py-2.5 text-sm font-bold text-teal hover:bg-teal hover:text-white"
              >
                <Phone className="size-4" aria-hidden="true" /> Llamar
              </a>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink/60">
              <Check className="mt-0.5 size-3.5 shrink-0 text-teal" aria-hidden="true" />
              No se cobra nada ahora: recepción confirma la disponibilidad y te envía por WhatsApp un link de pago seguro
              para cerrar tu reservación. Precios en pesos mexicanos (M.N.).
            </p>
          </div>
          )}
        </div>
      </form>

      {breakfastModal && (
        <BreakfastModal
          initial={breakfasts || guests}
          guests={guests}
          nights={nights}
          onClose={() => setBreakfastModal(false)}
          onSave={(n) => {
            setBreakfasts(n);
            setBreakfastModal(false);
          }}
        />
      )}
    </div>
  );
}

/** Popup para elegir cuántos desayunos por día (de 1 al número de huéspedes). */
function BreakfastModal({
  initial,
  guests,
  nights,
  onClose,
  onSave,
}: {
  initial: number;
  guests: number;
  nights: number;
  onClose: () => void;
  onSave: (n: number) => void;
}) {
  const [count, setCount] = useState(Math.min(Math.max(1, initial), guests));
  const days = Math.max(1, nights);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="breakfast-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coffee className="size-6 text-rust" aria-hidden="true" />
            <h3 id="breakfast-title" className="font-display text-2xl text-teal">
              Agregar desayuno
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1 text-ink/60 hover:bg-sand-light">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/70">
          ¿Cuántas personas desayunarán? {mxn(breakfastPrice)} por persona, por día.
        </p>

        <div className="mt-4 rounded-xl bg-sand-light/70 p-4">
          <Stepper
            label="Desayunos por día"
            hint={`Hasta ${guests} (huéspedes de tu reservación)`}
            value={count}
            min={1}
            max={guests}
            onChange={setCount}
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-ink/70">
            {count} x {mxn(breakfastPrice)} x {days} día{days !== 1 ? "s" : ""}
          </span>
          <span className="font-heavy text-xl font-black text-rust">{mxn(count * breakfastPrice * days)}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-black/15 px-4 py-2.5 text-sm font-bold text-ink hover:bg-sand-light"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(count)}
            className="rounded-lg bg-rust px-4 py-2.5 text-sm font-bold text-white hover:bg-rust-dark"
          >
            Agregar a mi reservación
          </button>
        </div>
      </div>
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
