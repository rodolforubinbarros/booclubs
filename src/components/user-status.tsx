"use client";

import { useSession } from "@/lib/auth-client";

export function UserStatus({ inline = false }: { inline?: boolean }) {
  const { data, isPending } = useSession();

  const container = inline
    ? "px-4 pb-4 text-center text-sm"
    : "fixed inset-x-0 bottom-4 text-center text-sm";

  if (isPending) {
    return (
      <p className={`text-black/50 ${container}`}>Verificando sessão...</p>
    );
  }

  const user = data?.user;

  return (
    <div className={`text-black/50 ${container}`}>
      {user ? (
        <p>
          Logado como{" "}
          <span className="font-medium text-black">{user.name}</span> ·{" "}
          {user.email}
        </p>
      ) : (
        <p>Você não está logado.</p>
      )}
    </div>
  );
}