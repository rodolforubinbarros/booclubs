"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { UserStatus } from "@/components/user-status";
import {
  obterClubes,
  obterClubesDoUsuario,
  obterMembrosDoClube,
  obterUsuarios,
  type ClubeDoUsuarioDto,
  type ClubeLeituraDto,
  type MembroDoClubeDto,
  type UsuarioDto,
} from "@/server/actions";

type MenuKey = "home" | "perfil" | "clubes" | "sobre";

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "perfil", label: "Meu Perfil" },
  { key: "clubes", label: "Clubes de Leitura" },
  { key: "sobre", label: "Sobre o BooClubs" },
];

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatoData.format(new Date(iso));
}

function rotuloLink(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram")) return "Instagram";
    return host;
  } catch {
    return url;
  }
}

function ConteudoHome() {
  const [usuarios, setUsuarios] = useState<UsuarioDto[] | null>(null);

  useEffect(() => {
    let ativo = true;
    obterUsuarios()
      .then((resultado) => {
        if (ativo) setUsuarios(resultado);
      })
      .catch(() => {
        if (ativo) setUsuarios([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Home</h2>
        <p className="text-sm text-black/60">
          Usuários cadastrados no BooClubs.
        </p>
      </div>

      {usuarios === null ? (
        <p className="text-sm text-black/50">Carregando usuários...</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-black/50">Nenhum usuário cadastrado.</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
          {usuarios.map((usuario) => (
            <li
              key={usuario.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-black">{usuario.name}</span>
                <span className="truncate text-sm text-black/60">
                  {usuario.email}
                </span>
              </div>
              <span className="shrink-0 text-sm text-black/40">
                Desde {formatarData(usuario.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConteudoPerfil() {
  const { data, isPending } = useSession();
  const user = data?.user;
  const userId = user?.id;
  const [clubes, setClubes] = useState<ClubeDoUsuarioDto[]>([]);
  const [carregandoClubes, setCarregandoClubes] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    obterClubesDoUsuario(userId)
      .then((resultado) => {
        if (ativo) {
          setClubes(resultado);
          setCarregandoClubes(false);
        }
      })
      .catch(() => {
        if (ativo) {
          setClubes([]);
          setCarregandoClubes(false);
        }
      });
    return () => {
      ativo = false;
    };
  }, [userId]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-sm text-black/50">Carregando sessao...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-sm text-black/50">
          Faca login para ver seu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Meu Perfil</h2>

      <div className="flex flex-col gap-0.5 rounded-lg border border-black/10 bg-white px-4 py-3">
        <span className="text-lg font-semibold text-black">{user.name}</span>
        <span className="text-sm text-black/60">{user.email}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-black">
          Clubes de leitura que participo
        </h3>

        {carregandoClubes ? (
          <p className="text-sm text-black/50">Carregando clubes...</p>
        ) : clubes.length === 0 ? (
          <p className="text-sm text-black/50">
            Voce ainda nao participa de nenhum clube.
          </p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
            {clubes.map((clube) => (
              <li key={clube.id} className="flex flex-col gap-0.5 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-black">{clube.nome}</span>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {clube.papel}
                  </span>
                </div>
                <p className="text-sm text-black/60">
                  {clube.genero ?? "Sem genero"} ·{" "}
                  {clube.local ?? "Local a combinar"} · {clube.membros}{" "}
                  membro(s)
                </p>
                {clube.link && (
                  <a
                    href={clube.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {rotuloLink(clube.link)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConteudoClubes() {
  const [busca, setBusca] = useState("");
  const [buscaDiferida, setBuscaDiferida] = useState("");
  const [clubes, setClubes] = useState<ClubeLeituraDto[] | null>(null);
  const [clubeAberto, setClubeAberto] = useState<ClubeLeituraDto | null>(null);
  const [membros, setMembros] = useState<MembroDoClubeDto[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [erroMembros, setErroMembros] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaDiferida(busca), 400);
    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    obterClubes(buscaDiferida)
      .then((resultado) => {
        if (ativo) setClubes(resultado);
      })
      .catch(() => {
        if (ativo) setClubes([]);
      });
    return () => {
      ativo = false;
    };
  }, [buscaDiferida]);

  async function abrirMembros(clube: ClubeLeituraDto) {
    setClubeAberto(clube);
    setMembros([]);
    setErroMembros(false);
    setCarregandoMembros(true);
    try {
      const resultado = await obterMembrosDoClube(clube.id);
      setMembros(resultado);
    } catch {
      setErroMembros(true);
    } finally {
      setCarregandoMembros(false);
    }
  }

  function fecharMembros() {
    setClubeAberto(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Clubes de Leitura</h2>
        <p className="text-sm text-black/60">
          Todos os clubes cadastrados. Busque por nome, gênero, local,
          descrição ou dono do clube.
        </p>
      </div>

      <input
        type="search"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar clubes..."
        className="w-full max-w-md rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
      />

      {clubes === null ? (
        <p className="text-sm text-black/50">Carregando clubes...</p>
      ) : clubes.length === 0 ? (
        <p className="text-sm text-black/50">
          Nenhum clube encontrado para &quot;{buscaDiferida}&quot;.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clubes.map((clube) => (
            <li
              key={clube.id}
              className="flex flex-col gap-1 rounded-lg border border-black/10 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold text-black">
                  {clube.nome}
                </span>
                <button
                  type="button"
                  onClick={() => abrirMembros(clube)}
                  title="Ver membros do clube"
                  className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {clube.membros} membro(s)
                </button>
              </div>
              <p className="text-sm text-black/70">
                {clube.descricao || "Sem descrição."}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/60">
                <span>{clube.genero ?? "Sem gênero"}</span>
                <span>Local: {clube.local ?? "a combinar"}</span>
                <span>Dono: {clube.dono_nome ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <a
                  href={clube.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {clube.link ? rotuloLink(clube.link) : "Sem link externo"}
                </a>
                <span className="text-xs text-black/40">
                  Criado em {formatarData(clube.criadoEm)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {clubeAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Membros de ${clubeAberto.nome}`}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={fecharMembros}
          />
          <div className="relative flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="text-lg font-semibold text-black">
                  {clubeAberto.nome}
                </h3>
                <p className="text-sm text-black/60">
                  {clubeAberto.membros} membro(s)
                </p>
              </div>
              <button
                type="button"
                onClick={fecharMembros}
                aria-label="Fechar"
                className="rounded-md p-2 text-black hover:bg-blue-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 overflow-y-auto">
              {carregandoMembros ? (
                <p className="text-sm text-black/50">Carregando membros...</p>
              ) : erroMembros ? (
                <p className="text-sm text-red-600">
                  Erro ao carregar os membros.
                </p>
              ) : membros.length === 0 ? (
                <p className="text-sm text-black/50">
                  Este clube ainda não possui membros.
                </p>
              ) : (
                <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
                  {membros.map((membro) => (
                    <li
                      key={membro.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium text-black">
                          {membro.nome}
                        </span>
                        <span className="truncate text-sm text-black/60">
                          {membro.email}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {membro.papel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
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

const CONTEUDO: Record<MenuKey, ReactNode> = {
  home: <ConteudoHome />,
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
  const [active, setActive] = useState<MenuKey>("home");
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

      <section className="flex min-h-0 flex-1 flex-col bg-blue-50">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {CONTEUDO[active]}
        </div>
        <UserStatus inline />
      </section>
    </div>
  );
}