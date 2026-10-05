"use client";

import { useActionState } from "react";
import { saveAdminNotes } from "@/lib/actions/admin";

export default function NotesForm({ id, initial }: { id: number; initial: string }) {
  const [state, action, pending] = useActionState(saveAdminNotes.bind(null, id), undefined);
  return (
    <form action={action} className="mt-3">
      <textarea
        name="admin_notes"
        defaultValue={initial}
        rows={4}
        placeholder="Factura, peticiones especiales, objetos olvidados…"
        className="w-full rounded-lg border-2 border-black/10 p-3 text-sm outline-none focus:border-teal"
      />
      <div className="mt-2 flex items-center gap-3">
        <button disabled={pending} className="rounded-md bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-dark disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar notas"}
        </button>
        {state?.ok && !pending && <span className="text-sm font-semibold text-teal">{state.ok}</span>}
      </div>
      <p className="mt-2 text-xs text-ink/50">Solo visibles en el panel.</p>
    </form>
  );
}
