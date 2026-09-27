"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoomImage } from "@/data/rooms";

export default function Gallery({ images, label }: { images: RoomImage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  // Autoavance suave; se detiene al interactuar
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [paused, go, count]);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={label}
      className="select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div
        className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-ink shadow-xl"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {images.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className={`object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            setPaused(true);
            go(-1);
          }}
          aria-label="Foto anterior"
          className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-teal shadow hover:bg-white"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => {
            setPaused(true);
            go(1);
          }}
          aria-label="Foto siguiente"
          className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-teal shadow hover:bg-white"
        >
          <ChevronRight className="size-6" />
        </button>
        <p className="absolute right-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white" aria-live="polite">
          {index + 1} / {count}
        </p>
      </div>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <li key={img.src} className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setPaused(true);
                setIndex(i);
              }}
              aria-label={`Ver foto ${i + 1}: ${img.alt}`}
              aria-current={i === index}
              className={`relative block h-16 w-24 overflow-hidden rounded-lg ring-2 transition ${
                i === index ? "ring-orange" : "opacity-70 ring-transparent hover:opacity-100"
              }`}
            >
              <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
