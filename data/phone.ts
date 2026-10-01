/**
 * Teléfonos de huéspedes: México (+52, por defecto) o Estados Unidos (+1), siempre 10 dígitos.
 * Se guardan como "+52 686 123 4567" / "+1 619 555 1234" para que WhatsApp y las llamadas funcionen.
 */

export type PhoneCountry = "MX" | "US";

export const PHONE_COUNTRIES: { code: PhoneCountry; dial: string; name: string }[] = [
  { code: "MX", dial: "52", name: "México" },
  { code: "US", dial: "1", name: "Estados Unidos" },
];

const dialOf = (c: PhoneCountry) => (c === "US" ? "1" : "52");

/**
 * Los 10 dígitos nacionales a partir de lo que escriba o pegue el huésped.
 * Quita la lada si viene incluida: 52 / 521 (celular MX, formato antiguo) o 1 (EE. UU.).
 */
export function nationalDigits(country: PhoneCountry, raw: string) {
  let d = raw.replace(/\D/g, "");
  if (country === "MX") {
    if (d.length === 13 && d.startsWith("521")) d = d.slice(3);
    else if (d.length === 12 && d.startsWith("52")) d = d.slice(2);
  } else if (d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }
  return d.slice(0, 10);
}

/** "6861234567" → "686 123 4567" */
export const formatNational = (d: string) =>
  [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");

/** Valida y regresa el teléfono listo para guardar ("+52 686 123 4567"), o null si no es válido. */
export function normalizePhone(country: PhoneCountry, raw: string) {
  if (country !== "MX" && country !== "US") return null;
  const d = nationalDigits(country, raw);
  if (d.length !== 10) return null;
  // Números de EE. UU.: lada y central no empiezan con 0 ni 1
  if (country === "US" && (/^[01]/.test(d) || /^[01]/.test(d.slice(3)))) return null;
  return `+${dialOf(country)} ${formatNational(d)}`;
}

/**
 * Dígitos para wa.me (lada + número). Acepta lo guardado ("+1 619…", "+52 686…")
 * y teléfonos antiguos sin lada (10 dígitos → México).
 */
export function whatsappDigits(stored: string) {
  const plus = stored.trim().startsWith("+");
  const d = stored.replace(/\D/g, "");
  if (plus && d.length === 11 && d.startsWith("1")) return d;
  if (d.length === 13 && d.startsWith("521")) return `52${d.slice(3)}`;
  if (d.length === 12 && d.startsWith("52")) return d;
  if (d.length === 10) return `52${d}`;
  return d;
}
