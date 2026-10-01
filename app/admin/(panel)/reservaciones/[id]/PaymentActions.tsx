"use client";

import { useState, useTransition } from "react";
import { Check, Copy, CreditCard, LoaderCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { sendPaymentLink } from "@/lib/actions/admin";
import type { Status } from "@/lib/reservations";

/**
 * Revisión de una solicitud:
 *  - «Hay disponibilidad»: confirma, genera la liga de pago de Stripe y abre WhatsApp para enviarla.
 *  - «Sin disponibilidad»: abre WhatsApp con un mensaje para ofrecer otras opciones.
 */
export default function PaymentActions({
  id,
  status,
  payLink,
  noAvailabilityUrl,
}: {
  id: number;
  status: Status;
  payLink: string | null;
  noAvailabilityUrl: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [link, setLink] = useState(payLink);
  const [copied, setCopied] = useState(false);

  const send = () => {
    setError("");
    // Abrir la pestaña dentro del clic (evita bloqueadores) y llenarla al generar la liga
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    start(async () => {
      const res = await sendPaymentLink(id).catch(() => ({ ok: false as const, error: "Sin conexión. Intenta de nuevo." }));
      if (!res.ok) {
        tab?.close();
        setError(res.error);
        return;
      }
      setLink(res.payUrl);
      if (tab) tab.location.href = res.waUrl;
      else window.location.href = res.waUrl;
    });
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const awaiting = status === "por_pagar";

  return (
    <div>
      {awaiting ? (
        <p className="text-sm text-ink/70">
          Se envió la liga de pago. La reservación se confirma sola cuando el huésped paga.
        </p>
      ) : (
        <p className="text-sm text-ink/70">Revisa si hay habitaciones disponibles para estas fechas y elige una opción:</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" aria-hidden="true" />}
          {awaiting ? "Reenviar liga de pago" : "Hay disponibilidad · Confirmar y enviar liga de pago"}
        </button>
        {!awaiting && (
          <a
            href={noAvailabilityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#25d366] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95"
          >
            <WhatsAppIcon className="size-4" /> Sin disponibilidad · Ofrecer otras opciones
          </a>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">
          {error}
        </p>
      )}

      {link && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-sand-light px-3 py-2 text-xs">
          <span className="font-bold text-ink/60">Liga de pago:</span>
          <a href={link} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-teal underline">
            {link}
          </a>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1 rounded bg-white px-2 py-1 font-bold text-ink ring-1 ring-black/10 hover:bg-sand-light"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
