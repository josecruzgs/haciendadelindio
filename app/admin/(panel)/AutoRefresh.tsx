"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarga los datos del panel cada minuto para ver solicitudes nuevas sin refrescar a mano. */
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      // No interrumpir si el usuario está escribiendo en un campo
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
