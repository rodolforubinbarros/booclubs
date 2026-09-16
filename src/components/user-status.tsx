"use client";

import { useSession } from "@/lib/auth-client";

export function UserStatus() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <p className="fixed inset-x-0 bottom-4 text-center text-sm text-black/50">
        Verificando sessão...
      </p>
    );
  }

  const user = data?.user;

  return (
    <div className="fixed inset-x-0 bottom-4 text-center text-sm">
      {user ? (
        <p className="text-black/50">
          Logado como{" "}
          <span className="font-medium text-black">{user.name}</span> ·{" "}
          {user.email}
        </p>
      ) : (
        <p className="text-black/50">Você não está logado.</p>
      )}
    </div>
  );
}