"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fmtLong, fmtMonth, monthGrid, startOfDay, toKey } from "./dates";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_MONTHS_AHEAD = 12;

type Props = {
  checkIn: Date | null;
  checkOut: Date | null;
  blocked: Set<string>;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  /** Meses visibles a la vez (1 en móvil, 2 en escritorio). */
  months?: 1 | 2;
};

export default function RangeCalendar({ checkIn, checkOut, blocked, onChange, months = 1 }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => {
    const base = checkIn ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hover, setHover] = useState<Date | null>(null);

  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD, 1);
  const canPrev = view > minMonth;
  const canNext = new Date(view.getFullYear(), view.getMonth() + months - 1, 1) < maxMonth;

  const isUnavailable = (d: Date) => d < today || blocked.has(toKey(d));

  /** ¿Hay alguna noche bloqueada entre a (incl.) y b (excl.)? */
  const rangeHasBlocked = (a: Date, b: Date) => {
    for (let d = a; d < b; d = addDays(d, 1)) if (blocked.has(toKey(d))) return true;
    return false;
  };

  const pick = (d: Date) => {
    if (!checkIn || checkOut || d <= checkIn || rangeHasBlocked(checkIn, d)) {
      if (isUnavailable(d)) return;
      onChange(d, null);
    } else {
      onChange(checkIn, d);
    }
  };

  const rangeEnd = checkOut ?? (checkIn && hover && hover > checkIn ? hover : null);

  return (
    <div>
      <div className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className="grid size-9 place-items-center rounded-md border border-black/15 text-ink hover:bg-sand-light disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className="grid size-9 place-items-center rounded-md border border-black/15 text-ink hover:bg-sand-light disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className={`-mt-9 grid gap-6 ${months === 2 ? "md:grid-cols-2" : ""}`}>
        {Array.from({ length: months }, (_, m) => {
          const month = new Date(view.getFullYear(), view.getMonth() + m, 1);
          return (
            <div key={toKey(month)} className={m > 0 ? "hidden md:block" : ""}>
              <p className="pointer-events-none flex h-9 items-center justify-center text-sm font-extrabold tracking-wider text-ink uppercase">
                {fmtMonth(month)}
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid" aria-label={fmtMonth(month)}>
                {WEEKDAYS.map((w) => (
                  <span key={w} className="pb-1 text-xs font-semibold text-ink/70" role="columnheader">
                    {w}
                  </span>
                ))}
                {monthGrid(month).map((d) => {
                  const inMonth = d.getMonth() === month.getMonth();
                  if (!inMonth) return <span key={toKey(d)} aria-hidden="true" />;
                  const unavailable = isUnavailable(d);
                  const isStart = checkIn && +d === +checkIn;
                  const isEnd = rangeEnd && +d === +rangeEnd;
                  const inRange = checkIn && rangeEnd && d > checkIn && d < rangeEnd;
                  // El día de salida puede ser un día bloqueado (se sale por la mañana)
                  const selectableAsCheckout = checkIn && !checkOut && d > checkIn && !rangeHasBlocked(checkIn, d);
                  const disabled = unavailable && !selectableAsCheckout;

                  let cls = "bg-teal-light text-teal hover:bg-teal/20";
                  if (disabled) cls = "bg-black/[0.03] text-ink/30 line-through cursor-not-allowed";
                  if (inRange) cls = "bg-teal/25 text-teal-dark";
                  if (isStart || isEnd) cls = "bg-teal text-white shadow";

                  return (
                    <button
                      key={toKey(d)}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${fmtLong(d)}${disabled ? " (no disponible)" : ""}`}
                      aria-pressed={Boolean(isStart || isEnd)}
                      className={`aspect-square rounded-md text-sm font-bold transition-colors sm:aspect-[5/4] ${cls}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
