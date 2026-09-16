"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { UserStatus } from "@/components/user-status";

type MenuKey = "perfil" | "clubes" | "sobre";

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "perfil", label: "Meu Perfil" },
  { key: "clubes", label: "Clubes de Leitura" },
  { key: "sobre", label: "Sobre o BooClubs" },
];

function ConteudoClubes() {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-bold tracking-tight">Clubes de Leitura</h2>
      <p className="text-sm text-black/60">Conteúdo em breve.</p>
    </div>
  );
}

function ConteudoSobre() {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-bold tracking-tight">Sobre o BooClubs</h2>
      <p className="text-sm text-black/60">Conteúdo em breve.</p>
    </div>
  );
}

function ConteudoPerfil(): ReactNode {
  const { data } = useSession();
  const user = data?.user;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>
      {user && (
        <p className="text-sm text-black/60">
          {user.name} · {user.email}
        </p>
      )}
    </div>
  );
}

const CONTEUDO: Record<MenuKey, ReactNode> = {
  perfil: <ConteudoPerfil />,
  clubes: <ConteudoClubes />,
  sobre: <ConteudoSobre />,
};

function MenuButton({
  item,
  active,
  onClick,
  center = false,
}: {
  item: { key: MenuKey; label: string };
  active: boolean;
  onClick: () => void;
  center?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        center ? "text-center" : "text-left"
      } ${active ? "bg-blue-600 text-white" : "text-black hover:bg-blue-50"}`}
    >
      {item.label}
    </button>
  );
}

export function Dashboard() {
  const router = useRouter();
  const [active, setActive] = useState<MenuKey>("perfil");

  const menuTop = MENU_ITEMS.filter((item) => item.key !== "sobre");
  const menuBottom = MENU_ITEMS.filter((item) => item.key === "sobre");

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-64 flex-col border-r border-black/10 bg-white p-4">
        <div className="flex items-center justify-center gap-2 px-2 pb-6">
          <Image
            src="/booclubs_logo.png"
            alt="BooClubs"
            width={1377}
            height={1438}
            className="h-10 w-auto"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-blue-600">
            BooClubs
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {menuTop.map((item) => (
            <MenuButton
              key={item.key}
              item={item}
              active={active === item.key}
              onClick={() => setActive(item.key)}
            />
          ))}
        </nav>
        <nav className="flex flex-col gap-1">
          {menuBottom.map((item) => (
            <MenuButton
              key={item.key}
              item={item}
              active={active === item.key}
              onClick={() => setActive(item.key)}
              center
            />
          ))}
        </nav>
        <nav className="mt-4 flex justify-center border-t border-black/10 pt-4">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Sair
          </button>
        </nav>
      </aside>
      <section className="flex-1 overflow-y-auto p-8">{CONTEUDO[active]}</section>
      <UserStatus />
    </div>
  );
}