import "server-only";

/**
 * Acceso a Postgres.
 * - Con DATABASE_URL o POSTGRES_URL (Neon, Supabase, Vercel Postgres…) usa el driver `postgres`.
 * - Sin DATABASE_URL usa PGlite (Postgres embebido) guardado en PGLITE_DIR o ./.data/pglite.
 *   Sirve para desarrollo y para servidores propios con disco persistente.
 */

type Row = Record<string, unknown>;
type QueryFn = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reservations (
  id           SERIAL PRIMARY KEY,
  code         TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pendiente',
  source       TEXT NOT NULL DEFAULT 'web',
  room         TEXT NOT NULL,
  rooms        INTEGER NOT NULL DEFAULT 1,
  adults       INTEGER NOT NULL,
  children     INTEGER NOT NULL DEFAULT 0,
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  nights       INTEGER NOT NULL,
  breakfast    BOOLEAN NOT NULL DEFAULT FALSE,
  total        INTEGER NOT NULL,
  promo_total  INTEGER,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  notes        TEXT,
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Canal por el que llegó: directa (botón Reservar ahora), whatsapp o recepcion (captura manual)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';
-- Número de desayunos por día (antes solo sí/no = uno por huésped)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS breakfasts INTEGER NOT NULL DEFAULT 0;
UPDATE reservations SET breakfasts = adults + children WHERE breakfast AND breakfasts = 0;
-- Pago en línea (Stripe): liga pública /pagar/<pay_token>
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pay_token TEXT UNIQUE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS amount_due INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_ref TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
-- Anticipo configurable y reembolsos: charge_total = total acordado, amount_due = cobro en línea
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS charge_total INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS amount_paid INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refunded_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_ref TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
UPDATE reservations SET charge_total = amount_due WHERE charge_total IS NULL AND amount_due IS NOT NULL;
UPDATE reservations SET amount_paid = amount_due WHERE amount_paid IS NULL AND paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations (status);
CREATE INDEX IF NOT EXISTS reservations_check_in_idx ON reservations (check_in);

-- Contador sin huecos para los folios (las secuencias de Postgres pueden saltar tras un reinicio)
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  n     INTEGER NOT NULL
);

-- Ajustes del panel (anticipo, plantillas de WhatsApp) en JSON
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id          SERIAL PRIMARY KEY,
  room        TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

type Holder = { query?: Promise<QueryFn> };
const g = globalThis as typeof globalThis & { __hdiDb?: Holder };
const holder: Holder = (g.__hdiDb ??= {});

async function connect(): Promise<QueryFn> {
  // DATABASE_URL (o POSTGRES_URL, que también crea la integración de Neon/Vercel)
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url && process.env.VERCEL) {
    // En Vercel el disco es de solo lectura: PGlite no puede guardar nada
    throw new Error(
      "Falta DATABASE_URL en Vercel. Conecta la base de datos al proyecto (Storage) sin prefijo y haz Redeploy.",
    );
  }
  let query: QueryFn;

  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
    query = async <T extends Row>(text: string, params: unknown[] = []) =>
      (await sql.unsafe(text, params as never[])) as unknown as T[];
    await sql.unsafe(SCHEMA);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const path = await import("node:path");
    const { mkdir } = await import("node:fs/promises");
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
    await mkdir(path.dirname(dir), { recursive: true });
    const db = await PGlite.create(dir);
    query = async <T extends Row>(text: string, params: unknown[] = []) =>
      (await db.query<T>(text, params)).rows;
    await db.exec(SCHEMA);
  }
  return query;
}

export async function query<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  holder.query ??= connect().catch((e) => {
    holder.query = undefined;
    throw e;
  });
  return (await holder.query)<T>(text, params);
}
