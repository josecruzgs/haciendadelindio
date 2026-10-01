"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Download, LoaderCircle, Trash2 } from "lucide-react";
import { previewCleanup, purgeNow, saveCleanupSettings, type CleanupPreview } from "@/lib/actions/admin";

const input = "mt-1 w-28 rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";

const fmtBytes = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);
const reservas = (n: number) => `${n} ${n === 1 ? "reservación" : "reservaciones"}`;
const fmtDate = (k: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`));

export default function CleanupCard({
  usage,
  settings,
}: {
  usage: { bytes: number; total: number; oldest: string | null };
  settings: { auto: boolean; months: number; limitMb: number; lastRun?: string; lastDeleted?: number };
}) {
  const [state, action, saving] = useActionState(saveCleanupSettings, undefined);
  const [months, setMonths] = useState(settings.months);
  const [limitMb, setLimitMb] = useState(settings.limitMb);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ ok: string } | { error: string } | null>(null);
  const [deleting, startDelete] = useTransition();

  // Vista previa de lo que se borraría al cambiar los meses
  useEffect(() => {
    setConfirm(false);
    const t = setTimeout(() => previewCleanup(months).then(setPreview).catch(() => setPreview(null)), 250);
    return () => clearTimeout(t);
  }, [months, result]);

  const used = usage.bytes / 1024 ** 2;
  const pct = Math.min(100, (used / Math.max(1, limitMb)) * 100);
  const count = preview && "reservations" in preview ? preview.reservations : 0;

  return (
    <div className="mt-4 space-y-5">
      {/* Uso de espacio */}
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-bold">
            {fmtBytes(usage.bytes)} <span className="font-normal text-ink/60">de {limitMb >= 1024 ? `${limitMb / 1024} GB` : `${limitMb} MB`}</span>
          </span>
          <span className="font-semibold text-ink/60">{pct.toFixed(pct < 10 ? 1 : 0)} % usado</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sand-light ring-1 ring-black/5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Espacio usado de la base de datos">
          <div className={`h-full rounded-full ${pct > 85 ? "bg-rust" : pct > 60 ? "bg-orange" : "bg-teal"}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink/60">
          Libre: <strong>{fmtBytes(Math.max(0, limitMb * 1024 ** 2 - usage.bytes))}</strong> · {reservas(usage.total)} guardada
          {usage.total !== 1 ? "s" : ""}
          {usage.oldest ? ` · la más antigua salió el ${fmtDate(usage.oldest)}` : ""}.
        </p>
        <p className="mt-1 text-xs text-ink/45">
          Cada reservación ocupa alrededor de 1 KB: 512 MB alcanzan para cientos de miles. Al borrar, Postgres reutiliza el
          espacio para datos nuevos, aunque el tamaño total puede tardar en bajar.
        </p>
      </div>

      <form action={action} className="space-y-4 border-t border-black/5 pt-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm font-semibold text-ink/75">
            Borrar reservaciones con salida de hace más de
            <span className="flex items-center gap-2">
              <input
                name="months"
                type="number"
                min={1}
                max={60}
                required
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className={input}
              />
              <span className="mt-1 text-sm font-normal">meses</span>
            </span>
          </label>
          <label className="block text-sm font-semibold text-ink/75">
            Límite de tu plan
            <span className="flex items-center gap-2">
              <input
                name="limitMb"
                type="number"
                min={1}
                required
                value={limitMb}
                onChange={(e) => setLimitMb(Number(e.target.value))}
                className={input}
              />
              <span className="mt-1 text-sm font-normal">MB</span>
            </span>
          </label>
        </div>

        {preview && "error" in preview ? (
          <p className="text-sm font-semibold text-rust-dark">{preview.error}</p>
        ) : preview ? (
          <p className="rounded-lg bg-sand-light px-3 py-2 text-sm text-ink/75">
            Con salida antes del <strong>{fmtDate(preview.cutoff)}</strong>: <strong>{reservas(preview.reservations)}</strong>
            {preview.blocks ? ` y ${preview.blocks} bloqueo${preview.blocks !== 1 ? "s" : ""} de fechas` : ""}.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {preview && "cutoff" in preview && count > 0 && (
            <a
              href={`/admin/exportar?antes=${preview.cutoff}`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-teal ring-1 ring-teal/40 hover:bg-teal-light"
            >
              <Download className="size-4" aria-hidden="true" /> Descargar respaldo (CSV)
            </a>
          )}
          {!confirm ? (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setConfirm(true);
              }}
              disabled={count === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-bold text-rust ring-1 ring-rust/40 hover:bg-rust/10 disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Eliminar ahora
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-md bg-rust/5 px-3 py-1.5 text-sm ring-1 ring-rust/30">
              <span className="font-semibold text-rust-dark">
                ¿Eliminar {reservas(count)}? No se puede deshacer.
              </span>
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  startDelete(async () => {
                    setResult(await purgeNow(months).catch(() => ({ error: "Sin conexión. Intenta de nuevo." })));
                    setConfirm(false);
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-rust px-3 py-1 font-bold text-white disabled:opacity-60"
              >
                {deleting && <LoaderCircle className="size-3.5 animate-spin" />} Sí, eliminar
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="font-semibold text-ink/60">
                No
              </button>
            </span>
          )}
        </div>
        {result && (
          <p className={`text-sm font-semibold ${"ok" in result ? "text-teal" : "text-rust-dark"}`} role="status">
            {"ok" in result ? result.ok : result.error}
          </p>
        )}

        <label className="flex items-start gap-2 border-t border-black/5 pt-4 text-sm">
          <input name="auto" type="checkbox" defaultChecked={settings.auto} className="mt-0.5 size-4 accent-teal" />
          <span>
            <span className="font-bold">Limpieza automática</span>
            <span className="block text-xs text-ink/60">
              Una vez al día (al abrir el panel) se borran las reservaciones con salida de hace más de los meses indicados.
              {settings.lastRun &&
                ` Última limpieza: ${fmtDate(settings.lastRun)}${settings.lastDeleted != null ? ` (${settings.lastDeleted} eliminadas)` : ""}.`}
            </span>
          </span>
        </label>

        {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
        {state?.ok && !saving && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
        <button disabled={saving} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar ajustes de limpieza"}
        </button>
      </form>
    </div>
  );
}
