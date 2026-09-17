"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { useAdministrador } from "@/lib/use-admin";
import { UserStatus } from "@/components/user-status";
import { ImagemClube, ImagemUsuario } from "@/components/imagens";
import { ChaveIcon } from "@/components/icones";
import {
  criarClube,
  entrarNoClube,
  excluirClube,
  obterClubes,
  obterClubesDoUsuario,
  obterMembrosDoClube,
  obterUsuarios,
  sairDoClube,
  type ClubeDoUsuarioDto,
  type ClubeVisivelDto,
  type MembroDoClubeDto,
  type UsuarioDto,
} from "@/server/actions";

type MenuKey = "home" | "perfil" | "clubes" | "cadastrar" | "sobre";

const MENU_PRINCIPAL: { key: MenuKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "perfil", label: "Meu Perfil" },
  { key: "clubes", label: "Clubes de Leitura" },
];

const MENU_CADASTRO: { key: MenuKey; label: string }[] = [
  { key: "cadastrar", label: "Cadastrar Clube de Leitura" },
];

const MENU_INSTITUCIONAL: { key: MenuKey; label: string }[] = [
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
              <div className="flex min-w-0 items-center gap-3">
                <ImagemUsuario
                  src={usuario.image}
                  alt={`Foto de ${usuario.name}`}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <span className="font-medium text-black">{usuario.name}</span>
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
  const [saindoId, setSaindoId] = useState<string | null>(null);

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

  async function sair(id: string) {
    setSaindoId(id);
    try {
      const resultado = await sairDoClube(id);
      if (resultado.ok) setClubes((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setSaindoId(null);
    }
  }

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

      <div className="flex items-center gap-4 rounded-lg border border-black/10 bg-white px-4 py-3">
        <ImagemUsuario
          src={user.image}
          alt={`Foto de ${user.name}`}
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-lg font-semibold text-black">{user.name}</span>
          <span className="text-sm text-black/60">{user.email}</span>
        </div>
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
              <li
                key={clube.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <ImagemClube
                  src={clube.imagem}
                  alt={`Imagem do clube ${clube.nome}`}
                  className="h-11 w-11 shrink-0 rounded-md object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-black">
                      {clube.nome}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {clube.papel}
                      </span>
                      <button
                        type="button"
                        disabled={saindoId === clube.id}
                        onClick={() => sair(clube.id)}
                        title="Sair do clube"
                        aria-label={`Sair do clube ${clube.nome}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {saindoId === clube.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConteudoClubes() {
  const administrador = useAdministrador();
  const [busca, setBusca] = useState("");
  const [buscaDiferida, setBuscaDiferida] = useState("");
  const [clubes, setClubes] = useState<ClubeVisivelDto[] | null>(null);
  const [clubeAberto, setClubeAberto] = useState<ClubeVisivelDto | null>(null);
  const [membros, setMembros] = useState<MembroDoClubeDto[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [erroMembros, setErroMembros] = useState(false);
  const [atualizacao, setAtualizacao] = useState(0);
  const [entrandoId, setEntrandoId] = useState<string | null>(null);
  const [erroEntrada, setErroEntrada] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState(false);

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
  }, [buscaDiferida, atualizacao]);

  async function entrar(clube: ClubeVisivelDto) {
    setEntrandoId(clube.id);
    setErroEntrada(false);
    try {
      const resultado = await entrarNoClube(clube.id);
      if (resultado.ok) {
        setClubes((prev) =>
          prev
            ? prev.map((c) =>
                c.id === clube.id ? { ...c, sou_membro: true, membros: c.membros + 1 } : c,
              )
            : prev,
        );
      } else {
        setErroEntrada(true);
      }
    } catch {
      setErroEntrada(true);
    } finally {
      setEntrandoId(null);
      setAtualizacao((v) => v + 1);
    }
  }

  async function abrirMembros(clube: ClubeVisivelDto) {
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

  async function excluir(clube: ClubeVisivelDto) {
    if (!window.confirm(`Excluir o clube "${clube.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setExcluindoId(clube.id);
    setErroExclusao(false);
    try {
      const resultado = await excluirClube(clube.id);
      if (resultado.ok) {
        setClubes((prev) => prev?.filter((c) => c.id !== clube.id) ?? prev);
        if (clubeAberto?.id === clube.id) setClubeAberto(null);
      } else {
        setErroExclusao(true);
      }
    } catch {
      setErroExclusao(true);
    } finally {
      setExcluindoId(null);
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

      {erroEntrada && (
        <p className="text-sm text-red-600">
          Não foi possível participar deste clube. Tente novamente.
        </p>
      )}

      {erroExclusao && (
        <p className="text-sm text-red-600">
          Não foi possível excluir este clube. Tente novamente.
        </p>
      )}

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
              className="flex flex-col gap-1 overflow-hidden rounded-lg border border-black/10 bg-white"
            >
              <ImagemClube
                src={clube.imagem}
                alt={`Imagem do clube ${clube.nome}`}
                className="h-32 w-full object-cover"
              />
              <div className="flex flex-col gap-1 px-4 pb-3 pt-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold text-black">
                  {clube.nome}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {clube.sou_membro ? (
                    <span
                      title="Você participa deste clube"
                      className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                    >
                      Você participa
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={entrandoId === clube.id}
                      onClick={() => entrar(clube)}
                      title="Participar deste clube"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 text-lg font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {entrandoId === clube.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirMembros(clube)}
                    title="Ver membros do clube"
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {clube.membros} membro(s)
                  </button>
                  {administrador && (
                    <span
                      title="Ação exclusiva de administrador"
                      className="flex items-center gap-1"
                    >
                      <ChaveIcon className="h-4 w-4 text-amber-600" />
                      <button
                        type="button"
                        disabled={excluindoId === clube.id}
                        onClick={() => excluir(clube)}
                        aria-label={`Excluir o clube ${clube.nome}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {excluindoId === clube.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        )}
                      </button>
                    </span>
                  )}
                </div>
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
                      <div className="flex min-w-0 items-center gap-3">
                        <ImagemUsuario
                          src={membro.imagem}
                          alt={`Foto de ${membro.nome}`}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                        <span className="font-medium text-black">
                          {membro.nome}
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

function ConteudoCadastro({ onCriado }: { onCriado?: () => void }) {
  const [estado, setEstado] = useState<
    "idle" | "enviando" | "feito" | "erro"
  >("idle");
  const [erro, setErro] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setEstado("enviando");
    setErro("");
    const formData = new FormData(form);
    try {
      const resultado = await criarClube({
        nome: String(formData.get("nome") ?? "").trim(),
        descricao: String(formData.get("descricao") ?? "").trim(),
        genero: String(formData.get("genero") ?? "").trim(),
        local: String(formData.get("local") ?? "").trim(),
        link: String(formData.get("link") ?? "").trim(),
      });
      if (resultado?.erro) {
        setErro(resultado.erro);
        setEstado("erro");
      } else {
        form.reset();
        setEstado("feito");
        onCriado?.();
      }
    } catch {
      setErro("Erro inesperado ao criar o clube. Tente novamente.");
      setEstado("erro");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">
          Cadastrar Clube de Leitura
        </h2>
        <p className="text-sm text-black/60">
          Crie um novo clube para começar a reunir leitores. Você será o dono
          dele.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="nome" className="text-sm font-medium text-black">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            placeholder="Ex.: Livro, Prosa & Cia"
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="descricao" className="text-sm font-medium text-black">
            Descrição *
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
            required
            placeholder="Como e quando o clube se encontra?"
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="genero" className="text-sm font-medium text-black">
            Gênero / tema *
          </label>
          <input
            id="genero"
            name="genero"
            type="text"
            required
            placeholder="Ex.: Romance, ficção científica..."
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="local" className="text-sm font-medium text-black">
            Local *
          </label>
          <input
            id="local"
            name="local"
            type="text"
            required
            placeholder="Ex.: A definir, biblioteca pública..."
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="link" className="text-sm font-medium text-black">
            Link externo
          </label>
          <input
            id="link"
            name="link"
            type="url"
            placeholder="https://..."
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        {estado === "feito" && (
          <p className="text-sm text-green-700">Clube criado com sucesso!</p>
        )}
        {estado === "erro" && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {estado === "enviando" ? "Criando..." : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}

const CONTEUDO: Record<Exclude<MenuKey, "cadastrar">, ReactNode> = {
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
  icone,
}: {
  item: { key: MenuKey; label: string };
  active: boolean;
  onClick: () => void;
  center?: boolean;
  icone?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        center ? "text-center" : "text-left"
      } ${active ? "bg-blue-600 text-white" : "text-black hover:bg-blue-50"}`}
    >
      {icone && (
        <span className="-mb-0.5 mr-1.5 inline-flex">{icone}</span>
      )}
      {item.label}
    </button>
  );
}

function Sidebar({
  active,
  onSelect,
  administrador,
}: {
  active: MenuKey;
  onSelect: (key: MenuKey) => void;
  administrador: boolean;
}) {
  const router = useRouter();

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
        {MENU_PRINCIPAL.map((item) => (
          <MenuButton
            key={item.key}
            item={item}
            active={active === item.key}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </nav>

      <nav className="mt-4 flex flex-col gap-1 border-t border-black/10 pt-4">
        {administrador &&
          MENU_CADASTRO.map((item) => (
            <MenuButton
              key={item.key}
              item={item}
              active={active === item.key}
              onClick={() => onSelect(item.key)}
              center
              icone={<ChaveIcon className="h-3.5 w-3.5" />}
            />
          ))}
      </nav>

      <nav className="flex flex-col gap-1">
        {MENU_INSTITUCIONAL.map((item) => (
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
  const administrador = useAdministrador();

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
        <Sidebar active={active} onSelect={select} administrador={administrador} />
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
            <Sidebar active={active} onSelect={select} administrador={administrador} />
          </aside>
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col bg-blue-50">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {active === "cadastrar" ? (
            <ConteudoCadastro onCriado={() => select("clubes")} />
          ) : (
            CONTEUDO[active]
          )}
        </div>
        <UserStatus inline />
      </section>
    </div>
  );
}