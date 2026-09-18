"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { AuthButtons } from "@/components/auth-buttons";
import { Dashboard } from "@/components/dashboard";
import { UserStatus } from "@/components/user-status";

export function App() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <p className="fixed inset-x-0 bottom-4 text-center text-sm text-black/50">
        Verificando sessão...
      </p>
    );
  }

  if (data?.user) {
    return <Dashboard />;
  }

  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="flex flex-col items-center gap-2" aria-label="Ir para a página inicial">
            <Image
              src="/booclubs_logo.png"
              alt="BooClubs"
              width={1377}
              height={1438}
              className="h-20 w-auto sm:h-24"
              priority
            />
            <h1 className="font-boo text-5xl font-bold tracking-tight text-blue-600 sm:text-6xl">
              BooClubs
            </h1>
          </Link>
        </div>
        <div className="mt-6">
          <AuthButtons />
        </div>
      </div>
      <UserStatus />
    </main>
  );
}