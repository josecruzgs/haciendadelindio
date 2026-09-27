import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Sesión de administrador: un solo usuario definido por variables de entorno.
 *   ADMIN_USER           nombre de usuario
 *   ADMIN_PASSWORD_HASH  generado con `npm run hash-password -- "<contraseña>"` (formato scrypt:<salt>:<hash>)
 *   SESSION_SECRET       cadena aleatoria larga para firmar la cookie
 */

const COOKIE = "hdi_admin";
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET no está configurado (mínimo 32 caracteres).");
  return s;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkCredentials(user: string, password: string) {
  const expectedUser = process.env.ADMIN_USER;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !hash) throw new Error("ADMIN_USER / ADMIN_PASSWORD_HASH no están configurados.");
  // Evaluar ambos para no filtrar por tiempo cuál falló
  const passOk = verifyPassword(password, hash);
  return safeEqual(user.trim(), expectedUser) && passOk;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function createSession(user: string) {
  const exp = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = Buffer.from(JSON.stringify({ u: user, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<{ user: string } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; exp: number };
    return data.exp > Date.now() ? { user: data.u } : null;
  } catch {
    return null;
  }
}

/** Para páginas y acciones del panel: redirige al login si no hay sesión válida. */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

/* ---------- Límite simple de intentos (memoria del proceso) ---------- */

const g = globalThis as typeof globalThis & { __hdiRate?: Map<string, number[]> };
const hits = (g.__hdiRate ??= new Map<string, number[]>());

/** true si `key` excedió `max` intentos en la ventana dada. Registra el intento. */
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}
