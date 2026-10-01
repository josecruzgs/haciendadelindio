"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatNational, nationalDigits, PHONE_COUNTRIES, type PhoneCountry } from "@/data/phone";

export function Flag({ country, className = "h-3.5 w-5" }: { country: PhoneCountry; className?: string }) {
  return country === "MX" ? (
    <svg viewBox="0 0 30 20" className={`${className} shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden="true">
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#ce1126" />
      <circle cx="15" cy="10" r="2.6" fill="#8c6a2f" />
    </svg>
  ) : (
    <svg viewBox="0 0 38 20" className={`${className} shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden="true">
      <rect width="38" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="38" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="15.2" height={(20 * 7) / 13} fill="#3c3b6e" />
    </svg>
  );
}

/**
 * Selector de país (bandera + lada) y número a 10 dígitos.
 * `value` son solo los dígitos nacionales; se muestran como "686 123 4567".
 */
export default function PhoneInput({
  country,
  value,
  onCountry,
  onChange,
  inputClassName = "",
  name,
}: {
  country: PhoneCountry;
  value: string;
  onCountry: (c: PhoneCountry) => void;
  onChange: (digits: string) => void;
  inputClassName?: string;
  /** Si se indica, envía `name` (número) y `name_country` en formularios. */
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = PHONE_COUNTRIES.find((c) => c.code === country)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`País del teléfono: ${current.name} (+${current.dial})`}
        className="flex shrink-0 items-center gap-1 rounded-md py-0.5 pr-1 text-sm font-semibold text-ink hover:bg-black/5"
      >
        <Flag country={country} />
        <span className="text-ink/70">+{current.dial}</span>
        <ChevronDown className="size-3.5 text-ink/50" aria-hidden="true" />
      </button>
      <input
        value={formatNational(value)}
        onChange={(e) => onChange(nationalDigits(country, e.target.value))}
        name={name}
        autoComplete="tel-national"
        inputMode="tel"
        placeholder={country === "MX" ? "686 000 0000" : "619 000 0000"}
        aria-label="Teléfono a 10 dígitos"
        className={`min-w-0 flex-1 bg-transparent outline-none ${inputClassName}`}
      />
      {name && <input type="hidden" name={`${name}_country`} value={country} />}

      {open && (
        <ul
          role="listbox"
          aria-label="País del teléfono"
          className="absolute top-full left-0 z-40 mt-2 w-56 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/10"
        >
          {PHONE_COUNTRIES.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === country}>
              <button
                type="button"
                onClick={() => {
                  onCountry(c.code);
                  onChange(nationalDigits(c.code, value));
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sand-light"
              >
                <Flag country={c.code} />
                <span className="flex-1 font-semibold">{c.name}</span>
                <span className="text-ink/55">+{c.dial}</span>
                {c.code === country && <Check className="size-4 text-teal" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
