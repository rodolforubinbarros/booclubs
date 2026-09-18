"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, useSession } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const { data } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.session) {
      router.replace("/");
    }
  }, [data, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    const { error } = await signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (error) {
      if (error.status === 401) {
        setError("E-mail ou senha inválidos.");
      } else {
        setError(
          `Erro ao entrar (${error.status ?? "?"}): ${error.message ?? error.code ?? "erro interno"}`,
        );
      }
      setPending(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center gap-2">
        <Link href="/" className="flex flex-col items-center gap-2" aria-label="Ir para a página inicial">
          <Image
            src="/booclubs_logo.png"
            alt="BooClubs"
            width={1377}
            height={1438}
            className="h-16 w-auto"
            priority
          />
          <h1 className="font-boo text-4xl font-bold tracking-tight text-blue-600">
            BooClubs
          </h1>
        </Link>
      </div>

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-black/60">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-blue-600 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}