"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export function AuthButtons() {
  const { data, isPending } = useSession();

  if (isPending || data?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/entrar"
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Entrar
      </Link>
      <Link
        href="/cadastro"
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Cadastre-se
      </Link>
    </div>
  );
}