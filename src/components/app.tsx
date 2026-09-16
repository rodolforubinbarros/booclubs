"use client";

import Image from "next/image";
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
    <main className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/booclubs_logo.png"
          alt="BooClubs"
          width={1377}
          height={1438}
          className="h-24 w-auto"
          priority
        />
        <h1 className="text-5xl font-bold tracking-tight text-blue-600">
          BooClubs
        </h1>
      </div>
      <AuthButtons />
      <UserStatus />
    </main>
  );
}