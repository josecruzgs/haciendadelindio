"use client";

import { useEffect, useState } from "react";

const KEY = "hdi-cookies";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* almacenamiento bloqueado: no insistir */
    }
  }, []);

  const save = (value: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-xl bg-white p-4 text-sm shadow-2xl ring-1 ring-black/10 sm:bottom-6"
    >
      <p>
        Usamos cookies para que el sitio funcione correctamente y para entender cómo se usa. Puedes aceptarlas o
        ajustar tus preferencias.
      </p>
      {settings && (
        <label className="mt-3 flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="size-4 accent-teal"
          />
          Cookies de análisis
        </label>
      )}
      <div className="mt-3 flex justify-end gap-2">
        {settings ? (
          <button
            type="button"
            onClick={() => save(analytics ? "all" : "essential")}
            className="rounded-md border border-teal px-4 py-1.5 font-bold text-teal hover:bg-teal-light"
          >
            Guardar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSettings(true)}
            className="rounded-md border border-teal px-4 py-1.5 font-bold text-teal hover:bg-teal-light"
          >
            Ajustes
          </button>
        )}
        <button
          type="button"
          onClick={() => save("all")}
          className="rounded-md bg-teal px-4 py-1.5 font-bold text-white hover:bg-teal-dark"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
