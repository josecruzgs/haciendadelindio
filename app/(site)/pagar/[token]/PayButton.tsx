"use client";

import { useActionState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { startPayment } from "@/lib/actions/public";

export default function PayButton({ token, label }: { token: string; label: string }) {
  const [state, action, pending] = useActionState(startPayment.bind(null, token), undefined);
  return (
    <form action={action} className="mt-6">
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rust px-5 py-3.5 font-heavy text-base font-extrabold text-white shadow-md transition-colors hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
        {pending ? "Abriendo pago seguro…" : label}
      </button>
      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">
          {state.error}
        </p>
      )}
    </form>
  );
}
