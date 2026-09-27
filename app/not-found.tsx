import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-sand-light py-24 text-center">
      <h1 className="font-display text-6xl text-teal">Página no encontrada</h1>
      <p className="mt-3 text-lg text-ink/75">La página que buscas no existe o cambió de lugar.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-teal px-5 py-2.5 font-bold text-white hover:bg-teal-dark">
          Ir al inicio
        </Link>
        <Link href="/reservar" className="rounded-md bg-rust px-5 py-2.5 font-bold text-white hover:bg-rust-dark">
          Reservar
        </Link>
      </div>
    </section>
  );
}
