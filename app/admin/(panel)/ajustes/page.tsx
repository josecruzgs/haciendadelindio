import type { Metadata } from "next";
import { CircleAlert, CircleCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getPricing } from "@/lib/catalog";
import { Card } from "@/components/admin/ui";
import AdvanceForm from "./AdvanceForm";
import PricesForm from "./PricesForm";
import TemplatesForm from "./TemplatesForm";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  await requireAdmin();
  const [{ advance, templates }, pricing] = await Promise.all([getSettings(), getPricing()]);
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const checks = [
    { ok: Boolean(key), label: key ? `Llave de Stripe configurada (${key.startsWith("sk_live") ? "modo real" : "modo de prueba"})` : "Falta STRIPE_SECRET_KEY" },
    { ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET), label: process.env.STRIPE_WEBHOOK_SECRET ? "Webhook configurado" : "Falta STRIPE_WEBHOOK_SECRET" },
    { ok: Boolean(process.env.SITE_URL), label: process.env.SITE_URL ? `Ligas con ${process.env.SITE_URL}` : "SITE_URL vacío: las ligas usan el dominio del panel" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl text-teal">Ajustes</h1>
        <p className="max-w-2xl text-sm text-ink/65">Precios, cobro en línea con Stripe y respuestas de WhatsApp para los huéspedes.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          <Card>
            <h2 id="precios" className="scroll-mt-4 font-display text-2xl text-teal">
              Precios y promoción
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              Tarifas que se muestran en el sitio y con las que se cotiza cada reservación, y el descuento por pagar en línea.
            </p>
            <PricesForm pricing={pricing} />
          </Card>
          <Card>
            <h2 className="font-display text-2xl text-teal">Pago por adelantado</h2>
            <p className="mt-1 text-sm text-ink/65">
              Cuánto se cobra con la liga de pago al confirmar una reservación. El resto se paga en recepción.
            </p>
            <AdvanceForm initial={advance} />
          </Card>
          <Card>
            <h2 className="font-display text-2xl text-teal">Estado de Stripe</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  {c.ok ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden="true" />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink/55">Estas llaves se configuran en las variables de entorno (.env.local o el hosting).</p>
          </Card>
        </div>

        <Card>
          <h2 id="respuestas" className="scroll-mt-4 font-display text-2xl text-teal">
            Respuestas de WhatsApp
          </h2>
          <p className="mt-1 text-sm text-ink/65">
            Mensajes que se abren listos para enviar desde cada reservación. Las del sistema se usan en botones
            específicos (liga de pago, sin disponibilidad, cancelación); puedes agregar las tuyas.
          </p>
          <TemplatesForm initial={templates} />
        </Card>
      </div>
    </div>
  );
}
