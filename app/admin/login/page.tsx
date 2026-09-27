import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: { absolute: "Acceso | Panel Hacienda del Indio" }, robots: { index: false } };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main className="mountains grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <Image src="/images/logo-color.png" alt="Hacienda del Indio Hotel" width={900} height={878} className="mx-auto h-auto w-28" priority />
        <h1 className="mt-4 text-center font-display text-3xl text-teal">Panel de reservaciones</h1>
        <LoginForm />
      </div>
    </main>
  );
}
