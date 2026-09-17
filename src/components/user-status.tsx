"use client";

import { useSession } from "@/lib/auth-client";
import { useAdministrador } from "@/lib/use-admin";
import { ImagemUsuario } from "@/components/imagens";
import { ChaveIcon } from "@/components/icones";

export function UserStatus({ inline = false }: { inline?: boolean }) {
  const { data, isPending } = useSession();
  const administrador = useAdministrador();

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
        <p className="flex items-center justify-center gap-1.5">
          <ImagemUsuario
            src={user.image}
            alt={`Foto de ${user.name}`}
            className="h-6 w-6 rounded-full object-cover"
          />
          Logado como{" "}
          <span className="font-medium text-black">{user.name}</span>
          {administrador && (
            <span
              title="Administrador do BooClubs"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
            >
              <ChaveIcon className="h-3 w-3" />
              Admin
            </span>
          )}
        </p>
      ) : (
        <p>Você não está logado.</p>
      )}
    </div>
  );
}