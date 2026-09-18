"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export function AuthButtons() {
  const { data, isPending } = useSession();

  if (isPending || data?.user) {
    return null;
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
      <Link
        href="/entrar"
        className="w-full rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
      >
        Entrar
      </Link>
      <Link
        href="/cadastro"
        className="w-full rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
      >
        Cadastre-se
      </Link>
    </div>
  );
}