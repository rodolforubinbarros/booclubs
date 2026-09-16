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

function Sidebar({
  active,
  onSelect,
}: {
  active: MenuKey;
  onSelect: (key: MenuKey) => void;
}) {
  const router = useRouter();
  const menuTop = MENU_ITEMS.filter((item) => item.key !== "sobre");
  const menuBottom = MENU_ITEMS.filter((item) => item.key === "sobre");

  return (
    <>
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
            onClick={() => onSelect(item.key)}
          />
        ))}
      </nav>
      <nav className="flex flex-col gap-1">
        {menuBottom.map((item) => (
          <MenuButton
            key={item.key}
            item={item}
            active={active === item.key}
            onClick={() => onSelect(item.key)}
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
    </>
  );
}

export function Dashboard() {
  const [active, setActive] = useState<MenuKey>("perfil");
  const [menuOpen, setMenuOpen] = useState(false);

  function select(key: MenuKey) {
    setActive(key);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/booclubs_logo.png"
            alt="BooClubs"
            width={1377}
            height={1438}
            className="h-8 w-auto"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-blue-600">
            BooClubs
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-2 text-black hover:bg-blue-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <aside className="hidden w-64 flex-col border-r border-black/10 bg-white p-4 md:flex">
        <Sidebar active={active} onSelect={select} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-2 text-black hover:bg-blue-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <Sidebar active={active} onSelect={select} />
          </aside>
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {CONTEUDO[active]}
        </div>
        <UserStatus inline />
      </section>
    </div>
  );
}