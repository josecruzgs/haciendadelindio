import Image from "next/image";
import Link from "next/link";
import { BedDouble, Users } from "lucide-react";
import { mxn, type Room } from "@/data/rooms";

export default function RoomCard({ room }: { room: Room }) {
  const cover = room.images[0];
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 rounded-md bg-teal px-3 py-1 font-heavy text-sm font-extrabold tracking-wider text-white uppercase">
          {room.cardName}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-3xl text-teal">{room.name}</h3>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/75">
          <li className="flex items-center gap-1.5">
            <BedDouble className="size-4 text-rust" aria-hidden="true" /> {room.beds}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4 text-rust" aria-hidden="true" /> Hasta {room.maxGuests} personas
          </li>
        </ul>
        <p className="mt-4 font-heavy text-3xl font-black text-rust">
          {mxn(room.price)}
          <span className="ml-1 text-sm font-bold text-ink/60">M.N. / noche</span>
        </p>
        <div className="mt-auto flex gap-2 pt-5">
          <Link
            href={`/habitaciones/${room.slug}`}
            className="flex-1 rounded-md border-2 border-teal px-4 py-2 text-center text-sm font-bold text-teal transition-colors hover:bg-teal hover:text-white"
          >
            Ver más
          </Link>
          <Link
            href={`/reservar?habitacion=${room.slug}`}
            className="flex-1 rounded-md bg-rust px-4 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-rust-dark"
          >
            Reservar
          </Link>
        </div>
      </div>
    </article>
  );
}
