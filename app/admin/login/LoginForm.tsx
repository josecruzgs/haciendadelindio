"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { login } from "@/lib/actions/admin";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-ink/75">Usuario</span>
        <input
          name="user"
          key={state?.user}
          defaultValue={state?.user}
          required
          autoComplete="username"
          autoFocus
          className="mt-1 w-full rounded-lg border-2 border-ink/15 px-3 py-2 outline-none focus:border-teal"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink/75">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border-2 border-ink/15 px-3 py-2 outline-none focus:border-teal"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-rust/10 px-3 py-2 text-sm font-semibold text-rust-dark">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 font-bold text-white hover:bg-teal-dark disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        Entrar
      </button>
    </form>
  );
}
