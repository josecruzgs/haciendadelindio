"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { saveTemplates } from "@/lib/actions/admin";
import { BUILTIN_TEMPLATES, PLACEHOLDERS, type Template } from "@/lib/templates";

const input = "w-full rounded-lg border-2 border-black/10 px-3 py-2 text-sm outline-none focus:border-teal";

export default function TemplatesForm({ initial }: { initial: Template[] }) {
  const [state, action, pending] = useActionState(saveTemplates, undefined);
  const [list, setList] = useState(initial);
  const focused = useRef<{ index: number; el: HTMLTextAreaElement } | null>(null);

  const update = (i: number, patch: Partial<Template>) => setList((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  /** Inserta la variable donde está el cursor del último mensaje editado. */
  const insert = (token: string) => {
    const f = focused.current;
    if (!f) return;
    const { selectionStart: a, selectionEnd: b, value } = f.el;
    update(f.index, { text: value.slice(0, a) + token + value.slice(b) });
    requestAnimationFrame(() => {
      f.el.focus();
      f.el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="templates" value={JSON.stringify(list.map(({ id, label, text }) => ({ id, label, text })))} />

      <details className="rounded-lg bg-sand-light px-3 py-2 text-xs">
        <summary className="cursor-pointer font-bold text-ink/70">Variables disponibles (clic para insertarlas)</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map(([token, desc]) => (
            <button
              key={token}
              type="button"
              title={desc}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(token)}
              className="rounded bg-white px-1.5 py-0.5 font-mono text-teal ring-1 ring-black/10 hover:bg-teal-light"
            >
              {token}
            </button>
          ))}
        </div>
      </details>

      {list.map((t, i) => {
        const original = BUILTIN_TEMPLATES.find((b) => b.id === t.id);
        return (
          <div key={t.id} className="rounded-xl p-3 ring-1 ring-black/10">
            <div className="flex items-center gap-2">
              <input
                value={t.label}
                onChange={(e) => update(i, { label: e.target.value })}
                aria-label="Nombre del botón"
                maxLength={40}
                className={`${input} max-w-60 font-bold`}
              />
              {t.builtin && <span className="rounded bg-teal-light px-1.5 py-0.5 text-[10px] font-bold text-teal uppercase">Sistema</span>}
              <div className="ml-auto flex gap-1">
                {original && original.text !== t.text && (
                  <button
                    type="button"
                    onClick={() => update(i, { text: original.text })}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-ink/60 hover:bg-sand-light"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Original
                  </button>
                )}
                {!t.builtin && (
                  <button
                    type="button"
                    onClick={() => setList((l) => l.filter((_, j) => j !== i))}
                    aria-label={`Borrar ${t.label}`}
                    className="rounded-md p-1.5 text-rust hover:bg-rust/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={t.text}
              onChange={(e) => update(i, { text: e.target.value })}
              onFocus={(e) => (focused.current = { index: i, el: e.currentTarget })}
              rows={Math.max(3, t.text.split("\n").length + 1)}
              maxLength={1500}
              aria-label={`Mensaje ${t.label}`}
              className={`${input} mt-2 resize-y`}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setList((l) => [...l, { id: `c_${Date.now().toString(36)}`, label: "Nueva respuesta", text: "Hola {nombre}, " }])}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-teal ring-1 ring-teal/40 hover:bg-teal-light"
      >
        <Plus className="size-4" aria-hidden="true" /> Agregar respuesta
      </button>

      {state?.error && <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm font-semibold text-teal">{state.ok}</p>}
      <div>
        <button disabled={pending} className="rounded-md bg-rust px-4 py-2 text-sm font-bold text-white hover:bg-rust-dark disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar respuestas"}
        </button>
      </div>
    </form>
  );
}
