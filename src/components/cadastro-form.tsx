"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { signUp, useSession } from "@/lib/auth-client";
import { OlhoFechadoIcon, OlhoIcon } from "@/components/icones";

function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-md border border-black/15 px-3 py-2 pr-10 text-sm focus:border-blue-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-black/40 transition-colors hover:text-black/70"
      >
        {visible ? (
          <OlhoFechadoIcon className="h-5 w-5" />
        ) : (
          <OlhoIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

export function CadastroForm() {
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
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      setPending(false);
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      setPending(false);
      return;
    }

    const { error } = await signUp.email({ name, email, password });

    if (error) {
      if (error.status === 422) {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError(
          `Erro ao criar conta (${error.status ?? "?"}): ${error.message ?? error.code ?? "erro interno"}`,
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
          <label htmlFor="name" className="text-sm font-medium">
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Seu nome"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

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
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmar senha
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita a senha"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-black/60">
        Já tem conta?{" "}
        <Link
          href="/entrar"
          className="font-medium text-blue-600 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}