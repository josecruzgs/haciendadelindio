import type { Metadata } from "next";
import RoomCard from "@/components/RoomCard";
import { rooms } from "@/data/rooms";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: "Habitaciones | Hacienda del Indio" },
  description: site.description,
  alternates: { canonical: "/habitaciones" },
};

export default function HabitacionesPage() {
  return (
    <section className="bg-sand-light py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h1 className="font-display text-5xl text-teal md:text-6xl">Habitaciones</h1>
          <p className="mx-auto mt-2 max-w-xl text-lg text-ink/80">
            Sencilla, doble o triple: elige la que mejor se acomode a tu familia o a tu equipo de trabajo.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.slug} room={room} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-ink/70">
          Precios por noche en M.N. Persona adicional +$200 M.N. · No se admiten mascotas.
        </p>
      </div>
    </section>
  );
}
