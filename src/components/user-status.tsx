"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

export function UserStatus() {
  const router = useRouter();
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
      {user && (
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
          className="fixed right-4 top-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Sair
        </button>
      )}
    </div>
  );
}