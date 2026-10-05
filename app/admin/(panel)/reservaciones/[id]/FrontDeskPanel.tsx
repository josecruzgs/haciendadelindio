"use client";

import { useActionState, useState, useTransition } from "react";
import { BedDouble, LogIn, LogOut, Trash2, Undo2 } from "lucide-react";
import {
  addPayment,
  assignRoomAction,
  checkIn,
  checkOut,
  removePayment,
  saveGuest,
  unassignRoomAction,
  undoCheckOutAction,
} from "@/lib/actions/frontdesk";
import { mxn } from "@/data/rooms";
import type { PhoneCountry } from "@/data/phone";
import PhoneInput from "@/components/PhoneInput";
import type { Status } from "@/lib/reservations";

const input = "mt-1 w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";
const label = "block text-sm font-semibold text-ink/75";
const btn = "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60";

export const payMethodLabel: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };

type RoomOpt = { id: number; number: string; housekeeping: string };

export function RoomsAndStay({
  id, status, rooms, assigned, free, checkInBlock, balance, checkedOut, hasRooms,
}: {
  id: number;
  status: Status;
  rooms: number;
  assigned: RoomOpt[];
  free: RoomOpt[];
  /** Por qué aún no puede registrar entrada (null = puede). */
  checkInBlock: string | null;
  balance: number;
  checkedOut: boolean;
  hasRooms: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [withBalance, setWithBalance] = useState(false);
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string } | void>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r && !r.ok) setError(r.error);
    });

  const active = ["pendiente", "por_pagar", "confirmada", "hospedado"].includes(status);
  const missing = rooms - assigned.length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold tracking-wide text-ink/55 uppercase">
          Habitación{rooms > 1 ? `es (${assigned.length} de ${rooms})` : ""}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {assigned.map((h) => (
            <span key={h.id} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-light py-1 pr-1 pl-3 font-heavy text-lg font-black text-teal">
              <BedDouble className="size-4" aria-hidden="true" /> {h.number}
              {active && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => unassignRoomAction(id, h.id))}
                  className="ml-1 rounded px-1.5 py-0.5 text-xs font-bold text-rust hover:bg-rust/10"
                  aria-label={`Quitar habitación ${h.number}`}
                >
                  Quitar
                </button>
              )}
            </span>
          ))}
          {assigned.length === 0 && <span className="text-sm font-semibold text-rust">Sin asignar</span>}
        </div>
        {active && missing > 0 && (
          hasRooms ? (
            free.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal" aria-label="Habitación libre">
                  <option value="">Elegir habitación libre…</option>
                  {free.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.number}
                      {h.housekeeping !== "limpia" ? ` (${h.housekeeping})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending || !pick}
                  onClick={() => run(async () => { const r = await assignRoomAction(id, Number(pick)); if (r.ok) setPick(""); return r; })}
                  className={`${btn} bg-teal text-white hover:bg-teal-dark`}
                >
                  Asignar
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-rust">No hay habitaciones de este tipo libres en esas fechas.</p>
            )
          ) : (
            <p className="mt-2 text-sm text-ink/60">
              Da de alta las habitaciones en <a href="/admin/recepcion/habitaciones" className="font-bold text-teal underline">Recepción → Administrar</a>.
            </p>
          )
        )}
      </div>

      {["pendiente", "por_pagar", "confirmada"].includes(status) && (
        <div className="border-t border-black/5 pt-4">
          <button
            type="button"
            disabled={pending || !!checkInBlock}
            onClick={() => run(() => checkIn(id))}
            className={`${btn} bg-teal text-white hover:bg-teal-dark`}
          >
            <LogIn className="size-4" aria-hidden="true" /> Registrar entrada (check-in)
          </button>
          {checkInBlock && <p className="mt-2 text-xs text-ink/55">{checkInBlock}</p>}
        </div>
      )}

      {status === "hospedado" && (
        <div className="space-y-2 border-t border-black/5 pt-4">
          {balance > 0 ? (
            <>
              <p className="text-sm font-bold text-rust">Saldo pendiente: {mxn(balance)}</p>
              <label className="flex items-center gap-2 text-sm text-ink/75">
                <input type="checkbox" checked={withBalance} onChange={(e) => setWithBalance(e.target.checked)} className="size-4 accent-rust" />
                Registrar la salida con saldo pendiente
              </label>
            </>
          ) : (
            <p className="text-sm font-semibold text-teal">Cuenta liquidada.</p>
          )}
          <button
            type="button"
            disabled={pending || (balance > 0 && !withBalance)}
            onClick={() => run(() => checkOut(id, withBalance))}
            className={`${btn} bg-rust text-white hover:bg-rust-dark`}
          >
            <LogOut className="size-4" aria-hidden="true" /> Registrar salida (check-out)
          </button>
          <p className="text-xs text-ink/55">La habitación pasa a «sucia» para limpieza.</p>
        </div>
      )}

      {status === "completada" && checkedOut && (
        <div className="border-t border-black/5 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => undoCheckOutAction(id))}
            className={`${btn} bg-white text-ink ring-1 ring-black/15 hover:bg-sand-light`}
          >
            <Undo2 className="size-4" aria-hidden="true" /> Deshacer salida
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeskPayments({
  id, balance, payments, canAdd,
}: {
  id: number;
  balance: number;
  payments: { id: number; amount: number; method: string; note: string | null; created_at: string }[];
  canAdd: boolean;
}) {
  const [state, action, pending] = useActionState(addPayment.bind(null, id), undefined);
  const [removing, start] = useTransition();
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Tijuana" }).format(new Date(iso));
  return (
    <div>
      {payments.length > 0 && (
        <ul className="mb-3 divide-y divide-black/5 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <strong>{mxn(p.amount)}</strong> · {payMethodLabel[p.method] ?? p.method}
                <span className="block text-xs text-ink/50">
                  {fmt(p.created_at)}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => start(() => removePayment(id, p.id))}
                className="rounded p-1.5 text-ink/40 hover:bg-rust/10 hover:text-rust"
                aria-label="Eliminar pago"
                title="Eliminar pago (si se registró por error)"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <form action={action} key={payments.length} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
          <label className={label}>
            Monto
            <input name="amount" type="number" min={1} required defaultValue={balance > 0 ? balance : ""} className={input} />
          </label>
          <label className={label}>
            Forma de pago
            <select name="method" defaultValue="efectivo" className={input}>
              {Object.entries(payMethodLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Nota (opcional)
            <input name="note" maxLength={200} placeholder="Terminación de tarjeta, folio de transferencia…" className={input} />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button disabled={pending} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>
              {pending ? "Guardando…" : "Registrar pago"}
            </button>
            {state?.ok && !pending && <span className="text-sm font-semibold text-teal">{state.ok}</span>}
          </div>
          {state?.error && <p role="alert" className="text-sm font-semibold text-rust sm:col-span-2">{state.error}</p>}
        </form>
      )}
    </div>
  );
}

export function GuestForm({
  id, initial,
}: {
  id: number;
  initial: { name: string; phone: string; phoneCountry: PhoneCountry; guest_email: string; guest_id: string; guest_city: string; vehicle: string };
}) {
  const [state, action, pending] = useActionState(saveGuest.bind(null, id), undefined);
  const [phone, setPhone] = useState(initial.phone);
  const [country, setCountry] = useState<PhoneCountry>(initial.phoneCountry);
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        Nombre
        <input name="name" required defaultValue={initial.name} className={input} />
      </label>
      <div className={label} role="group" aria-label="Teléfono">
        Teléfono
        <div className="mt-1 rounded-lg border-2 border-black/10 px-3 py-2 text-sm font-normal focus-within:border-teal">
          <PhoneInput country={country} value={phone} onCountry={setCountry} onChange={setPhone} name="phone" />
        </div>
      </div>
      <label className={label}>
        Correo
        <input name="guest_email" type="email" defaultValue={initial.guest_email} className={input} />
      </label>
      <label className={label}>
        Identificación
        <input name="guest_id" defaultValue={initial.guest_id} placeholder="INE, pasaporte…" className={input} />
      </label>
      <label className={label}>
        Procedencia
        <input name="guest_city" defaultValue={initial.guest_city} placeholder="Ciudad, estado" className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Vehículo / placas
        <input name="vehicle" defaultValue={initial.vehicle} placeholder="Modelo, color, placas" className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>
          {pending ? "Guardando…" : "Guardar datos"}
        </button>
        {state?.ok && !pending && <span className="text-sm font-semibold text-teal">{state.ok}</span>}
      </div>
      {state?.error && <p role="alert" className="text-sm font-semibold text-rust sm:col-span-2">{state.error}</p>}
    </form>
  );
}
