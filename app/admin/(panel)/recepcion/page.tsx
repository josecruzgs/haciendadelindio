import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Settings2, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { addDaysKey, fmtKey, fmtKeyCap, isDateKey, todayKey } from "@/lib/dates";
import { dayMovements, listHotelRooms, staysInRange, type HotelRoom, type Movement, type Stay } from "@/lib/frontdesk";
import { balanceDue } from "@/lib/reservations";
import { getRoom, rooms as roomTypes } from "@/data/rooms";
import { Card, money } from "@/components/admin/ui";
import HousekeepingButtons from "./HousekeepingButtons";

export const metadata: Metadata = { title: "Recepción" };

type Tile = {
  room: HotelRoom;
  stay: Stay | null;
  state: "ocupada" | "sale" | "llega" | "reservada" | "libre";
};

const stateMeta: Record<Tile["state"], { label: string; cls: string }> = {
  ocupada: { label: "Ocupada", cls: "bg-teal-dark text-white" },
  sale: { label: "Sale", cls: "bg-orange text-teal-dark" },
  llega: { label: "Llega", cls: "bg-teal-light text-teal ring-1 ring-teal/40" },
  reservada: { label: "Reservada", cls: "bg-teal-light text-teal" },
  libre: { label: "Libre", cls: "bg-white text-teal ring-1 ring-teal/30" },
};

function tileFor(room: HotelRoom, stays: Stay[], day: string): Tile {
  const here = stays.filter((s) => s.room_id === room.id && s.status !== "completada");
  // Prioridad: huésped hospedado, luego la reservación que llega ese día, luego cualquier otra
  const stay = here.find((s) => s.status === "hospedado") ?? here.find((s) => s.check_in === day) ?? here[0] ?? null;
  if (!stay) return { room, stay, state: "libre" };
  if (stay.status === "hospedado") return { room, stay, state: stay.departure <= day ? "sale" : "ocupada" };
  return { room, stay, state: stay.check_in === day ? "llega" : "reservada" };
}

export default async function FrontDeskPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await requireAdmin();
  const today = todayKey();
  const sp = await searchParams;
  const day = isDateKey(sp.fecha) ? sp.fecha : today;
  const isToday = day === today;

  const [hotelRooms, { assigned }, moves] = await Promise.all([
    listHotelRooms(),
    staysInRange(day, addDaysKey(day, 1)),
    dayMovements(day, isToday),
  ]);
  const tiles = hotelRooms.map((r) => tileFor(r, assigned, day));
  const count = (f: (t: Tile) => boolean) => tiles.filter(f).length;
  const occupied = count((t) => t.state === "ocupada" || t.state === "sale");
  const stats = [
    { label: "Habitaciones", value: tiles.length },
    { label: isToday ? "Ocupadas" : "Ocupadas / reservadas", value: isToday ? occupied : count((t) => t.state !== "libre") },
    { label: "Libres", value: count((t) => t.state === "libre") },
    ...(isToday
      ? [
          { label: "Libres y limpias", value: count((t) => t.state === "libre" && t.room.housekeeping === "limpia") },
          { label: "Por limpiar", value: count((t) => t.room.housekeeping === "sucia") },
          { label: "Mantenimiento", value: count((t) => t.room.housekeeping === "mantenimiento") },
        ]
      : []),
  ];

  const long = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-teal">Recepción</h1>
          <p className="text-sm text-ink/65">
            {fmtKeyCap(day, long)}
            {isToday && <span className="ml-2 rounded bg-rust px-1.5 py-0.5 text-xs font-bold text-white">Hoy</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5" aria-label="Cambiar día">
            <Link href={`/admin/recepcion?fecha=${addDaysKey(day, -1)}`} className="rounded-md p-1.5 text-teal hover:bg-sand-light" aria-label="Día anterior">
              <ChevronLeft className="size-4" />
            </Link>
            {!isToday && (
              <Link href="/admin/recepcion" className="rounded-md px-2 py-1 text-sm font-semibold text-teal hover:bg-sand-light">
                Hoy
              </Link>
            )}
            <form action="/admin/recepcion" className="flex">
              <input
                type="date"
                name="fecha"
                defaultValue={day}
                aria-label="Fecha"
                className="rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal"
              />
              <button className="rounded-md px-2 py-1 text-sm font-semibold text-teal hover:bg-sand-light">Ver</button>
            </form>
            <Link href={`/admin/recepcion?fecha=${addDaysKey(day, 1)}`} className="rounded-md p-1.5 text-teal hover:bg-sand-light" aria-label="Día siguiente">
              <ChevronRight className="size-4" />
            </Link>
          </nav>
          <Link
            href="/admin/reservaciones/nueva?walkin=1"
            className="inline-flex items-center gap-1.5 rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark"
          >
            <UserPlus className="size-4" aria-hidden="true" /> Llegada sin reservación
          </Link>
        </div>
      </div>

      {hotelRooms.length === 0 ? (
        <Card className="max-w-2xl">
          <h2 className="font-display text-2xl text-teal">Primero da de alta las habitaciones</h2>
          <p className="mt-2 text-sm text-ink/70">
            Para ver la ocupación, asignar habitaciones y registrar entradas y salidas, agrega los números de habitación del
            hotel y su tipo (sencilla, doble o triple).
          </p>
          <Link href="/admin/recepcion/habitaciones" className="mt-4 inline-flex rounded-md bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-dark">
            Agregar habitaciones
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="font-heavy text-3xl font-black text-teal">{s.value}</p>
                <p className="text-sm font-semibold text-ink/70">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MovementList
              title={isToday ? "Llegadas pendientes" : "Llegadas"}
              icon={<LogIn className="size-5 text-teal" aria-hidden="true" />}
              empty="Sin llegadas pendientes."
              rows={moves.arrivals}
              day={day}
              kind="in"
            />
            <MovementList
              title={isToday ? "Salidas pendientes" : "Salidas"}
              icon={<LogOut className="size-5 text-rust" aria-hidden="true" />}
              empty="Sin salidas pendientes."
              rows={moves.departures}
              day={day}
              kind="out"
            />
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl text-teal">Habitaciones</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink/60">
                {(Object.keys(stateMeta) as Tile["state"][]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className={`inline-block size-3 rounded-sm ${stateMeta[k].cls}`} /> {stateMeta[k].label}
                  </span>
                ))}
                <Link href="/admin/recepcion/habitaciones" className="inline-flex items-center gap-1 font-bold text-teal hover:text-rust">
                  <Settings2 className="size-3.5" aria-hidden="true" /> Administrar
                </Link>
              </div>
            </div>
            {roomTypes.map((type) => {
              const group = tiles.filter((t) => t.room.type === type.slug);
              if (!group.length) return null;
              return (
                <div key={type.slug} className="mt-5">
                  <h3 className="text-xs font-bold tracking-wide text-ink/55 uppercase">
                    {type.name} · {group.filter((t) => t.state === "libre").length} libre{group.filter((t) => t.state === "libre").length !== 1 ? "s" : ""} de {group.length}
                  </h3>
                  <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {group.map((t) => (
                      <RoomTile key={t.room.id} tile={t} day={day} isToday={isToday} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

function RoomTile({ tile: { room, stay, state }, day, isToday }: { tile: Tile; day: string; isToday: boolean }) {
  const m = stateMeta[state];
  const maint = room.housekeeping === "mantenimiento";
  return (
    <li className={`flex flex-col overflow-hidden rounded-lg ring-1 ${maint ? "ring-rust/50" : "ring-black/10"} bg-white`}>
      <div className={`flex items-center justify-between px-3 py-2 ${m.cls}`}>
        <span className="font-heavy text-2xl leading-none font-black">{room.number}</span>
        <span className="text-[11px] font-bold tracking-wide uppercase">{m.label}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5 text-xs">
        {stay ? (
          <Link href={`/admin/reservaciones/${stay.reservation_id}`} className="block min-w-0 hover:underline">
            <span className="block truncate text-sm font-bold text-ink">{stay.name}</span>
            <span className="block text-ink/60">
              {stay.code} · {fmtKey(stay.check_in, { day: "numeric", month: "short" })} → {fmtKey(stay.departure, { day: "numeric", month: "short" })}
            </span>
            {state === "sale" && stay.departure < day && <span className="font-bold text-rust">Salida vencida</span>}
          </Link>
        ) : (
          <span className="text-ink/50">{getRoom(room.type)?.cardName}{room.notes ? ` · ${room.notes}` : ""}</span>
        )}
        {isToday ? (
          <div className="mt-auto space-y-1.5">
            <HousekeepingButtons id={room.id} value={room.housekeeping} />
            {state === "libre" && !maint && (
              <Link
                href={`/admin/reservaciones/nueva?walkin=1&habitacion=${room.id}`}
                className="flex items-center justify-center gap-1 rounded bg-rust py-1 text-[11px] font-bold text-white hover:bg-rust-dark"
              >
                <DoorOpen className="size-3.5" aria-hidden="true" /> Registrar llegada
              </Link>
            )}
          </div>
        ) : (
          maint && <span className="mt-auto font-bold text-rust">En mantenimiento</span>
        )}
      </div>
    </li>
  );
}

function MovementList({
  title, icon, empty, rows, day, kind,
}: { title: string; icon: React.ReactNode; empty: string; rows: Movement[]; day: string; kind: "in" | "out" }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-2xl text-teal">
        {icon} {title} <span className="text-base text-ink/45">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/5">
          {rows.map((r) => {
            const late = kind === "in" ? r.check_in < day : r.check_out < day;
            const owed = balanceDue(r);
            return (
              <li key={r.id}>
                <Link href={`/admin/reservaciones/${r.id}#recepcion`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-sand-light/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {r.name} <span className="font-normal text-ink/50">· {r.code}</span>
                    </span>
                    <span className="block text-sm text-ink/65">
                      {getRoom(r.room)?.cardName}
                      {r.rooms > 1 ? ` x${r.rooms}` : ""} · {r.nights} noche{r.nights !== 1 ? "s" : ""}
                      {late && (
                        <strong className="ml-1 text-rust">
                          · {kind === "in" ? "llegada" : "salida"} del {fmtKey(kind === "in" ? r.check_in : r.check_out, { day: "numeric", month: "short" })}
                        </strong>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    {r.room_numbers.length ? (
                      <span className="rounded bg-teal-light px-2 py-0.5 font-bold text-teal">Hab. {r.room_numbers.join(", ")}</span>
                    ) : (
                      <span className="rounded bg-orange/20 px-2 py-0.5 font-bold text-rust-dark">Sin asignar</span>
                    )}
                    {r.status === "por_pagar" && <span className="rounded bg-white px-2 py-0.5 font-bold text-teal ring-1 ring-teal/40">Esperando pago</span>}
                    {owed > 0 && <span className="font-bold text-rust">Saldo {money(owed)}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
