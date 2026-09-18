"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, signOut, useSession } from "@/lib/auth-client";
import { useAdministrador } from "@/lib/use-admin";
import { UserStatus } from "@/components/user-status";
import { ImagemClube, ImagemUsuario } from "@/components/imagens";
import { ChaveIcon } from "@/components/icones";
import {
  adicionarAmigo,
  atualizarSobre,
  criarClube,
  desfazerAmizade,
  editarClube,
  editarUsuario,
  entrarNoClube,
  excluirClube,
  obterAmigos,
  obterClubes,
  obterClubesDoUsuario,
  obterMembrosDoClube,
  obterSobre,
  obterUsuariosLista,
  obterUsuariosPorBusca,
  sairDoClube,
  type AmigoDto,
  type ClubeDoUsuarioDto,
  type ClubeVisivelDto,
  type MembroDoClubeDto,
  type UsuarioListaDto,
  type UsuarioPerfilDto,
} from "@/server/actions";

type MenuKey =
  | "perfil"
  | "fantasmas"
  | "patota"
  | "clubes"
  | "cadastrar"
  | "usuarios"
  | "sobre"
  | "editar-perfil";

const MENU_PRINCIPAL: { key: MenuKey; label: string }[] = [
  { key: "perfil", label: "Meu Perfil" },
  { key: "fantasmas", label: "Fantasmas" },
  { key: "patota", label: "Minha Patota" },
  { key: "clubes", label: "Clubes de Leitura" },
];

const IMAGEM_PATOTA = "/icones/patota.png";

const CORES_BARRA: Record<MenuKey, { texto: string; fundo: string }> = {
  perfil: { texto: "text-blue-600", fundo: "bg-blue-100" },
  fantasmas: { texto: "text-purple-600", fundo: "bg-purple-100" },
  patota: { texto: "text-emerald-600", fundo: "bg-emerald-100" },
  clubes: { texto: "text-amber-600", fundo: "bg-amber-100" },
  cadastrar: { texto: "text-black/60", fundo: "bg-blue-100" },
  usuarios: { texto: "text-black/60", fundo: "bg-blue-100" },
  sobre: { texto: "text-black/60", fundo: "bg-blue-100" },
  "editar-perfil": { texto: "text-black/60", fundo: "bg-blue-100" },
};

const MENU_CADASTRO: { key: MenuKey; label: string }[] = [
  { key: "cadastrar", label: "Cadastrar Clube de Leitura" },
  { key: "usuarios", label: "Listar Usuários" },
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

const LIMITE_IMAGEM_PERFIL = 1024 * 1024; // 1 MB
const DIMENSAO_MAXIMA_IMAGEM_PERFIL = 512;

function contemTransparencia(
  contexto: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): boolean {
  try {
    const dados = contexto.getImageData(0, 0, largura, altura).data;
    for (let i = 3; i < dados.length; i += 4) {
      if (dados[i] < 255) return true;
    }
  } catch {
    // Sem acesso aos pixels (canvas sujo) -> assume sem transparência.
  }
  return false;
}

function comprimirImagem(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    leitor.onload = () => {
      const imagem = document.createElement("img");
      imagem.onerror = () =>
        reject(new Error("O arquivo não é uma imagem válida."));
      imagem.onload = () => {
        try {
          const escala = Math.min(
            1,
            DIMENSAO_MAXIMA_IMAGEM_PERFIL /
              Math.max(imagem.width, imagem.height),
          );
          const largura = Math.max(1, Math.round(imagem.width * escala));
          const altura = Math.max(1, Math.round(imagem.height * escala));
          const canvas = document.createElement("canvas");
          canvas.width = largura;
          canvas.height = altura;
          const contexto = canvas.getContext("2d");
          if (!contexto) throw new Error("Canvas indisponível.");
          contexto.imageSmoothingEnabled = true;
          contexto.imageSmoothingQuality = "high";
          contexto.drawImage(imagem, 0, 0, largura, altura);
          const webp = canvas.toDataURL("image/webp", 0.8);
          if (contemTransparencia(contexto, largura, altura)) {
            resolve(
              webp.startsWith("data:image/webp")
                ? webp
                : canvas.toDataURL("image/png"),
            );
          } else {
            resolve(
              webp.startsWith("data:image/webp")
                ? webp
                : canvas.toDataURL("image/jpeg", 0.8),
            );
          }
        } catch (erro) {
          reject(
            erro instanceof Error
              ? erro
              : new Error("Falha ao processar a imagem."),
          );
        }
      };
      imagem.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });
}

function ConteudoPerfil({ onEditar }: { onEditar?: () => void }) {
  const { data, isPending } = useSession();
  const user = data?.user;
  const userId = user?.id;
  const [clubes, setClubes] = useState<ClubeDoUsuarioDto[]>([]);
  const [carregandoClubes, setCarregandoClubes] = useState(true);
  const [saindoId, setSaindoId] = useState<string | null>(null);
  const [clubeParaSair, setClubeParaSair] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [clubeAberto, setClubeAberto] = useState<ClubeDoUsuarioDto | null>(
    null,
  );
  const [membros, setMembros] = useState<MembroDoClubeDto[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [erroMembros, setErroMembros] = useState(false);

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
    setClubeParaSair(null);
    setSaindoId(id);
    try {
      const resultado = await sairDoClube(id);
      if (resultado.ok) setClubes((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setSaindoId(null);
    }
  }

  async function abrirMembros(clube: ClubeDoUsuarioDto) {
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
        </div>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="ml-auto shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Alterar dados do perfil
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white px-4 py-3">
        <h3 className="text-lg font-semibold text-black">Sobre mim</h3>
        <p className="text-sm text-black/60">
          {user.bio?.trim() ? user.bio : "Voce ainda nao escreveu uma bio."}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Tema favorito</span>
            <span className="text-sm text-black">
              {user.temaFavorito?.trim() || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Autor(a) favorito</span>
            <span className="text-sm text-black">
              {user.autorFavorito?.trim() || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Livro que indica</span>
            <span className="text-sm text-black">
              {user.livroIndicado?.trim() || "—"}
            </span>
          </div>
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
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {clubes.map((clube) => (
              <li
                key={clube.id}
                className="flex flex-col gap-3 overflow-hidden rounded-lg border border-black/10 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <ImagemClube
                    src={clube.imagem}
                    alt={`Imagem do clube ${clube.nome}`}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-lg font-semibold text-black">
                    {clube.nome}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    title="Você participa deste clube"
                    className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                  >
                    Você participa
                  </span>
                  {(clube.papel === "dono" || clube.papel === "membro") && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {clube.papel}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirMembros(clube)}
                    title="Ver membros do clube"
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {clube.membros} membro(s)
                  </button>
                  <button
                    type="button"
                    disabled={saindoId === clube.id}
                    onClick={() =>
                      setClubeParaSair({ id: clube.id, nome: clube.nome })
                    }
                    title="Sair do clube"
                    aria-label={`Sair do clube ${clube.nome}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {saindoId === clube.id ? (
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
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-black/70">
                    {clube.descricao || "Sem descrição."}
                  </p>
                  <div className="flex flex-col gap-1 text-sm text-black/60">
                    <span>Gênero: {clube.genero ?? "Sem gênero"}</span>
                    <span>Local: {clube.local ?? "a combinar"}</span>
                    <span>Dono: {clube.dono_nome ?? "—"}</span>
                  </div>
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
                  <span className="text-xs text-black/40">
                    Criado em {formatarData(clube.criadoEm)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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

      <ModalConfirmacao
        aberto={clubeParaSair !== null}
        perigo
        titulo="Sair do clube"
        mensagem={`Você tem certeza que deseja deixar o clube "${clubeParaSair?.nome}"?`}
        confirmando={clubeParaSair !== null && saindoId === clubeParaSair.id}
        onConfirmar={() => clubeParaSair && sair(clubeParaSair.id)}
        onCancelar={() => setClubeParaSair(null)}
      />
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
  const [clubeParaExcluir, setClubeParaExcluir] =
    useState<ClubeVisivelDto | null>(null);
  const [clubeParaEntrar, setClubeParaEntrar] =
    useState<ClubeVisivelDto | null>(null);
  const [clubeParaEditar, setClubeParaEditar] =
    useState<ClubeVisivelDto | null>(null);

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
    setClubeParaEntrar(null);
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
    setClubeParaExcluir(null);
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
              className="flex flex-col gap-3 overflow-hidden rounded-lg border border-black/10 bg-white p-3"
            >
              <div className="flex items-center gap-3">
                <ImagemClube
                  src={clube.imagem}
                  alt={`Imagem do clube ${clube.nome}`}
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-lg font-semibold text-black">
                  {clube.nome}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                    onClick={() => setClubeParaEntrar(clube)}
                    title="Participar deste clube"
                    className="flex h-7 items-center gap-1 rounded-full border border-blue-200 px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
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
                    Participar
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
                      onClick={() => setClubeParaEditar(clube)}
                      aria-label={`Alterar o cadastro do clube ${clube.nome}`}
                      title="Alterar cadastro do clube"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={excluindoId === clube.id}
                      onClick={() => setClubeParaExcluir(clube)}
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

              <div className="flex flex-col gap-2">
                <p className="text-sm text-black/70">
                  {clube.descricao || "Sem descrição."}
                </p>
                <div className="flex flex-col gap-1 text-sm text-black/60">
                  <span>Gênero: {clube.genero ?? "Sem gênero"}</span>
                  <span>Local: {clube.local ?? "a combinar"}</span>
                  <span>Dono: {clube.dono_nome ?? "—"}</span>
                </div>
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
      <ModalConfirmacao
        aberto={clubeParaEntrar !== null}
        titulo="Participar do clube"
        mensagem={`Você tem certeza que deseja participar do clube "${clubeParaEntrar?.nome}"?`}
        confirmando={
          clubeParaEntrar !== null && entrandoId === clubeParaEntrar.id
        }
        rotuloConfirmar="Sim, participar"
        onConfirmar={() => clubeParaEntrar && entrar(clubeParaEntrar)}
        onCancelar={() => setClubeParaEntrar(null)}
      />
      <ModalConfirmacao
        aberto={clubeParaExcluir !== null}
        perigo
        titulo="Excluir clube"
        mensagem={`Você tem certeza que deseja excluir o clube "${clubeParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        confirmando={
          clubeParaExcluir !== null && excluindoId === clubeParaExcluir.id
        }
        rotuloConfirmar="Sim, excluir"
        onConfirmar={() => clubeParaExcluir && excluir(clubeParaExcluir)}
        onCancelar={() => setClubeParaExcluir(null)}
      />
      {clubeParaEditar && (
        <ModalEditarClube
          clube={clubeParaEditar}
          onFechar={() => setClubeParaEditar(null)}
          onSalvo={(atualizado) => {
            setClubes(
              (prev) =>
                prev?.map((c) => (c.id === atualizado.id ? atualizado : c)) ??
                prev,
            );
            setClubeParaEditar(null);
          }}
        />
      )}
    </div>
  );
}

function ModalEditarClube({
  clube,
  onFechar,
  onSalvo,
}: {
  clube: ClubeVisivelDto;
  onFechar: () => void;
  onSalvo: (clube: ClubeVisivelDto) => void;
}) {
  const [nome, setNome] = useState(clube.nome);
  const [descricao, setDescricao] = useState(clube.descricao ?? "");
  const [genero, setGenero] = useState(clube.genero ?? "");
  const [local, setLocal] = useState(clube.local ?? "");
  const [link, setLink] = useState(clube.link ?? "");
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(
    null,
  );
  const [erroImagem, setErroImagem] = useState("");
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState("");
  const [confirmarSalvar, setConfirmarSalvar] = useState(false);

  async function aoEscolherImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    setErroImagem("");
    setImagemSelecionada(null);
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErroImagem("Escolha um arquivo de imagem válido.");
      return;
    }
    if (arquivo.size > LIMITE_IMAGEM_PERFIL) {
      setErroImagem("Por enquanto só é possível enviar imagens de até 1 MB.");
      return;
    }
    setProcessandoImagem(true);
    try {
      setImagemSelecionada(await comprimirImagem(arquivo));
    } catch {
      setErroImagem("Não foi possível processar a imagem. Tente novamente.");
    } finally {
      setProcessandoImagem(false);
    }
  }

  function submeter() {
    setErro("");
    setEstado("idle");
    setConfirmarSalvar(true);
  }

  async function salvar() {
    setConfirmarSalvar(false);
    setEstado("enviando");
    setErro("");
    try {
      const resultado = await editarClube(clube.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        genero: genero.trim(),
        local: local.trim(),
        link: link.trim(),
        imagem: imagemSelecionada ?? clube.imagem,
      });
      if (resultado?.erro) {
        setErro(resultado.erro);
        setEstado("erro");
        return;
      }
      onSalvo({
        ...clube,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        genero: genero.trim() || null,
        local: local.trim() || null,
        link: link.trim() || null,
        imagem: imagemSelecionada ?? clube.imagem,
      });
    } catch {
      setErro("Erro inesperado ao salvar o clube. Tente novamente.");
      setEstado("erro");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Alterar cadastro de ${clube.nome}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-lg font-semibold text-black">
              Alterar cadastro do clube
            </h3>
            <p className="text-sm text-black/60">{clube.nome}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submeter();
          }}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <fieldset disabled={estado === "enviando"} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-3">
              <div className="flex items-center gap-4">
                <ImagemClube
                  src={imagemSelecionada ?? clube.imagem}
                  alt={`Imagem do clube ${clube.nome}`}
                  className="h-16 w-16 shrink-0 rounded-md object-cover"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-black">
                    Foto do clube
                  </span>
                  <span className="text-xs text-black/50">
                    JPG, PNG ou WebP, de até 1 MB. A imagem é compactada antes
                    de ser salva.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={processandoImagem}
                  onClick={() => inputImagemRef.current?.click()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processandoImagem
                    ? "Processando..."
                    : imagemSelecionada
                      ? "Trocar foto"
                      : "Escolher foto"}
                </button>
                {imagemSelecionada && (
                  <button
                    type="button"
                    onClick={() => setImagemSelecionada(null)}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-black hover:bg-blue-50"
                  >
                    Manter foto atual
                  </button>
                )}
                <input
                  ref={inputImagemRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={aoEscolherImagem}
                />
              </div>
              {erroImagem && (
                <p className="text-sm text-red-600">{erroImagem}</p>
              )}
              {imagemSelecionada && (
                <p className="text-sm text-green-700">
                  Nova foto selecionada. Ela será salva ao confirmar as
                  alterações.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-nome"
                className="text-sm font-medium text-black"
              >
                Nome *
              </label>
              <input
                id="editar-nome"
                name="nome"
                type="text"
                required
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-descricao"
                className="text-sm font-medium text-black"
              >
                Descrição *
              </label>
              <textarea
                id="editar-descricao"
                name="descricao"
                rows={3}
                required
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-genero"
                className="text-sm font-medium text-black"
              >
                Gênero / tema *
              </label>
              <input
                id="editar-genero"
                name="genero"
                type="text"
                required
                value={genero}
                onChange={(event) => setGenero(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-local"
                className="text-sm font-medium text-black"
              >
                Local *
              </label>
              <input
                id="editar-local"
                name="local"
                type="text"
                required
                value={local}
                onChange={(event) => setLocal(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-link"
                className="text-sm font-medium text-black"
              >
                Link externo
              </label>
              <input
                id="editar-link"
                name="link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            {estado === "erro" && (
              <p className="text-sm text-red-600">{erro}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {estado === "enviando" ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={onFechar}
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-blue-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <ModalConfirmacao
        aberto={confirmarSalvar}
        titulo="Salvar alterações"
        mensagem={`Você tem certeza que deseja salvar as alterações no cadastro do clube "${clube.nome}"?`}
        confirmando={estado === "enviando"}
        rotuloConfirmar="Sim, salvar"
        onConfirmar={salvar}
        onCancelar={() => setConfirmarSalvar(false)}
      />
    </div>
  );
}

function ModalEditarUsuario({
  usuario,
  onFechar,
  onSalvo,
}: {
  usuario: UsuarioListaDto;
  onFechar: () => void;
  onSalvo: (usuario: UsuarioListaDto) => void;
}) {
  const [nome, setNome] = useState(usuario.name);
  const [email, setEmail] = useState(usuario.email);
  const [bio, setBio] = useState(usuario.bio ?? "");
  const [temaFavorito, setTemaFavorito] = useState(usuario.temaFavorito ?? "");
  const [autorFavorito, setAutorFavorito] = useState(
    usuario.autorFavorito ?? "",
  );
  const [livroIndicado, setLivroIndicado] = useState(
    usuario.livroIndicado ?? "",
  );
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(
    null,
  );
  const [erroImagem, setErroImagem] = useState("");
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState("");
  const [confirmarSalvar, setConfirmarSalvar] = useState(false);

  async function aoEscolherImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    setErroImagem("");
    setImagemSelecionada(null);
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErroImagem("Escolha um arquivo de imagem válido.");
      return;
    }
    if (arquivo.size > LIMITE_IMAGEM_PERFIL) {
      setErroImagem("Por enquanto só é possível enviar imagens de até 1 MB.");
      return;
    }
    setProcessandoImagem(true);
    try {
      setImagemSelecionada(await comprimirImagem(arquivo));
    } catch {
      setErroImagem("Não foi possível processar a imagem. Tente novamente.");
    } finally {
      setProcessandoImagem(false);
    }
  }

  function submeter() {
    setErro("");
    setEstado("idle");
    setConfirmarSalvar(true);
  }

  async function salvar() {
    setConfirmarSalvar(false);
    setEstado("enviando");
    setErro("");
    try {
      const resultado = await editarUsuario(usuario.id, {
        nome: nome.trim(),
        email: email.trim(),
        bio: bio.trim(),
        temaFavorito: temaFavorito.trim(),
        autorFavorito: autorFavorito.trim(),
        livroIndicado: livroIndicado.trim(),
        imagem: imagemSelecionada ?? usuario.image,
      });
      if (resultado?.erro) {
        setErro(resultado.erro);
        setEstado("erro");
        return;
      }
      onSalvo({
        ...usuario,
        name: nome.trim(),
        email: email.trim(),
        bio: bio.trim() || null,
        temaFavorito: temaFavorito.trim() || null,
        autorFavorito: autorFavorito.trim() || null,
        livroIndicado: livroIndicado.trim() || null,
        image: imagemSelecionada ?? usuario.image,
      });
    } catch {
      setErro("Erro inesperado ao salvar o usuário. Tente novamente.");
      setEstado("erro");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Alterar cadastro de ${usuario.name}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-lg font-semibold text-black">
              Alterar cadastro do usuário
            </h3>
            <p className="text-sm text-black/60">{usuario.name}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submeter();
          }}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <fieldset
            disabled={estado === "enviando"}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-3">
              <div className="flex items-center gap-4">
                <ImagemUsuario
                  src={imagemSelecionada ?? usuario.image}
                  alt={`Foto de ${usuario.name}`}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-black">
                    Foto de perfil
                  </span>
                  <span className="text-xs text-black/50">
                    JPG, PNG ou WebP, de até 1 MB. A imagem é compactada antes
                    de ser salva.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={processandoImagem}
                  onClick={() => inputImagemRef.current?.click()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processandoImagem
                    ? "Processando..."
                    : imagemSelecionada
                      ? "Trocar foto"
                      : "Escolher foto"}
                </button>
                {imagemSelecionada && (
                  <button
                    type="button"
                    onClick={() => setImagemSelecionada(null)}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-black hover:bg-blue-50"
                  >
                    Manter foto atual
                  </button>
                )}
                <input
                  ref={inputImagemRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={aoEscolherImagem}
                />
              </div>
              {erroImagem && (
                <p className="text-sm text-red-600">{erroImagem}</p>
              )}
              {imagemSelecionada && (
                <p className="text-sm text-green-700">
                  Nova foto selecionada. Ela será salva ao confirmar as
                  alterações.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-nome"
                className="text-sm font-medium text-black"
              >
                Nome *
              </label>
              <input
                id="editar-usuario-nome"
                name="nome"
                type="text"
                required
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-email"
                className="text-sm font-medium text-black"
              >
                E-mail *
              </label>
              <input
                id="editar-usuario-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <p className="text-xs text-black/50">
                Se alterado, o usuário precisará verificar o novo e-mail.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-bio"
                className="text-sm font-medium text-black"
              >
                Bio
              </label>
              <textarea
                id="editar-usuario-bio"
                name="bio"
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Conte um pouco sobre o usuário..."
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <p className="text-xs text-black/50">
                Até 500 caracteres ({bio.length}/500)
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-tema"
                className="text-sm font-medium text-black"
              >
                Tema favorito
              </label>
              <input
                id="editar-usuario-tema"
                name="temaFavorito"
                type="text"
                value={temaFavorito}
                onChange={(event) => setTemaFavorito(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-autor"
                className="text-sm font-medium text-black"
              >
                Autor(a) favorito
              </label>
              <input
                id="editar-usuario-autor"
                name="autorFavorito"
                type="text"
                value={autorFavorito}
                onChange={(event) => setAutorFavorito(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="editar-usuario-livro"
                className="text-sm font-medium text-black"
              >
                Livro que indica
              </label>
              <input
                id="editar-usuario-livro"
                name="livroIndicado"
                type="text"
                value={livroIndicado}
                onChange={(event) => setLivroIndicado(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            {estado === "erro" && (
              <p className="text-sm text-red-600">{erro}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {estado === "enviando" ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={onFechar}
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-blue-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <ModalConfirmacao
        aberto={confirmarSalvar}
        titulo="Salvar alterações"
        mensagem={`Você tem certeza que deseja salvar as alterações no cadastro de "${usuario.name}"?`}
        confirmando={estado === "enviando"}
        rotuloConfirmar="Sim, salvar"
        onConfirmar={salvar}
        onCancelar={() => setConfirmarSalvar(false)}
      />
    </div>
  );
}

function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  confirmando = false,
  onConfirmar,
  onCancelar,
  rotuloConfirmar = "Sim",
  rotuloCancelar = "Não",
  perigo = false,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  perigo?: boolean;
}) {
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative flex max-h-full w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-black">{titulo}</h3>
        <p className="mt-2 text-sm text-black/60">{mensagem}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={confirmando}
            onClick={onCancelar}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-blue-50 disabled:opacity-50"
          >
            {rotuloCancelar}
          </button>
          <button
            type="button"
            disabled={confirmando}
            onClick={onConfirmar}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              perigo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmando ? "Aguarde..." : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPerfilUsuario({
  usuario,
  onFechar,
  rodape,
}: {
  usuario: UsuarioPerfilDto;
  onFechar: () => void;
  rodape?: ReactNode;
}) {
  const [clubes, setClubes] = useState<ClubeDoUsuarioDto[] | null>(null);

  useEffect(() => {
    let ativo = true;
    obterClubesDoUsuario(usuario.id)
      .then((resultado) => {
        if (ativo) setClubes(resultado);
      })
      .catch(() => {
        if (ativo) setClubes([]);
      });
    return () => {
      ativo = false;
    };
  }, [usuario.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${usuario.name}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ImagemUsuario
              src={usuario.image}
              alt={`Foto de ${usuario.name}`}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-lg font-semibold text-black">
                {usuario.name}
              </h3>
              <span className="text-xs text-black/40">
                Membro desde {formatarData(usuario.criadoEm)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
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

        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Sobre mim</span>
            <p className="text-sm text-black/60">
              {usuario.bio?.trim() || "Sem bio."}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Tema favorito</span>
            <span className="text-sm text-black">
              {usuario.temaFavorito?.trim() || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Autor(a) favorito</span>
            <span className="text-sm text-black">
              {usuario.autorFavorito?.trim() || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-black/40">Livro que indica</span>
            <span className="text-sm text-black">
              {usuario.livroIndicado?.trim() || "—"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-black">
            Clubes de leitura
          </h4>
          {clubes === null ? (
            <p className="text-sm text-black/50">Carregando clubes...</p>
          ) : clubes.length === 0 ? (
            <p className="text-sm text-black/60">
              {usuario.name} ainda não participa de nenhum clube.
            </p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg border border-black/10 px-3 py-2">
              {clubes.map((clube) => (
                <li key={clube.id} className="flex items-center gap-2">
                  <ImagemClube
                    src={clube.imagem}
                    alt={`Imagem do clube ${clube.nome}`}
                    className="h-7 w-7 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-black">
                    {clube.nome}
                  </span>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {clube.papel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rodape && <div className="mt-4">{rodape}</div>}
      </div>
    </div>
  );
}

function ConteudoFantasmas() {
  const { data: sessao } = useSession();
  const sessaoUserId = sessao?.user?.id;
  const [busca, setBusca] = useState("");
  const [buscaDiferida, setBuscaDiferida] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioPerfilDto[] | null>(null);
  const [usuarioAberto, setUsuarioAberto] = useState<UsuarioPerfilDto | null>(
    null,
  );
  const [adicionandoId, setAdicionandoId] = useState<string | null>(null);
  const [erroAmizade, setErroAmizade] = useState(false);
  const [idsAmigos, setIdsAmigos] = useState<Set<string> | null>(null);
  const [usuarioParaAdicionar, setUsuarioParaAdicionar] =
    useState<UsuarioPerfilDto | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaDiferida(busca), 400);
    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    if (!buscaDiferida.trim()) return;
    let ativo = true;
    obterUsuariosPorBusca(buscaDiferida)
      .then((resultado) => {
        if (ativo) setUsuarios(resultado);
      })
      .catch(() => {
        if (ativo) setUsuarios([]);
      });
    return () => {
      ativo = false;
    };
  }, [buscaDiferida]);

  useEffect(() => {
    let ativo = true;
    obterAmigos()
      .then((resultado) => {
        if (ativo) setIdsAmigos(new Set(resultado.map((amigo) => amigo.id)));
      })
      .catch(() => {
        if (ativo) setIdsAmigos(new Set());
      });
    return () => {
      ativo = false;
    };
  }, []);

  function abrirUsuario(usuario: UsuarioPerfilDto) {
    setUsuarioAberto(usuario);
    setErroAmizade(false);
  }

  function fecharUsuario() {
    setUsuarioAberto(null);
    setErroAmizade(false);
  }

  async function adicionar(id: string) {
    if (!sessaoUserId || sessaoUserId === id) return;
    setUsuarioParaAdicionar(null);
    setAdicionandoId(id);
    setErroAmizade(false);
    try {
      const resultado = await adicionarAmigo(id);
      if (resultado.ok) {
        setIdsAmigos((prev) => new Set(prev ?? []).add(id));
      } else {
        setErroAmizade(true);
      }
    } catch {
      setErroAmizade(true);
    } finally {
      setAdicionandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Fantasmas</h2>
        <p className="text-sm text-black/60">
          Busque leitores por nome, biografia, tema favorito, autor(a) favorito
          ou livro que indica.
        </p>
      </div>

      <input
        type="search"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar usuários..."
        className="w-full max-w-md rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
      />

      {!buscaDiferida.trim() ? null : usuarios === null ? (
        <p className="text-sm text-black/50">Carregando usuários...</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-black/50">
          Nenhum usuário encontrado para &quot;{buscaDiferida}&quot;.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
          {usuarios.map((usuario) => (
            <li
              key={usuario.id}
              className="flex items-center gap-2 px-4 py-3"
            >
              {sessaoUserId && sessaoUserId !== usuario.id ? (
                <button
                  type="button"
                  disabled={adicionandoId === usuario.id}
                  onClick={() => setUsuarioParaAdicionar(usuario)}
                  title={
                    idsAmigos?.has(usuario.id)
                      ? "Já faz parte da sua patota"
                      : "Adicionar à patota"
                  }
                  aria-label={`Adicionar ${usuario.name} à patota`}
                  className={
                    idsAmigos?.has(usuario.id)
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  }
                >
                  {adicionandoId === usuario.id ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                  ) : idsAmigos?.has(usuario.id) ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6M22 11h-6" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="w-8 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => abrirUsuario(usuario)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left hover:bg-blue-50"
              >
                <ImagemUsuario
                  src={usuario.image}
                  alt={`Foto de ${usuario.name}`}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
                <span className="truncate font-medium text-black">
                  {usuario.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {usuarioAberto && (
        <ModalPerfilUsuario
          usuario={usuarioAberto}
          onFechar={fecharUsuario}
          rodape={
            sessaoUserId && sessaoUserId !== usuarioAberto.id ? (
              <>
                {erroAmizade && (
                  <p className="mb-2 text-sm text-red-600">
                    Não foi possível alterar a amizade. Tente novamente.
                  </p>
                )}
                {idsAmigos?.has(usuarioAberto.id) ?? false ? (
                  <span className="flex w-fit items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Vocês são amigos
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={adicionandoId === usuarioAberto.id}
                    onClick={() => setUsuarioParaAdicionar(usuarioAberto)}
                    className="flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {adicionandoId === usuarioAberto.id ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M19 8v6M22 11h-6" />
                      </svg>
                    )}
                    {adicionandoId === usuarioAberto.id
                      ? "Adicionando..."
                      : "Adicionar à patota"}
                  </button>
                )}
              </>
            ) : undefined
          }
        />
      )}

      <ModalConfirmacao
        aberto={usuarioParaAdicionar !== null}
        titulo="Adicionar à patota"
        mensagem={`Você tem certeza que deseja adicionar ${usuarioParaAdicionar?.name} à sua patota?`}
        confirmando={
          usuarioParaAdicionar !== null &&
          adicionandoId === usuarioParaAdicionar.id
        }
        rotuloConfirmar="Sim, adicionar"
        onConfirmar={() => usuarioParaAdicionar && adicionar(usuarioParaAdicionar.id)}
        onCancelar={() => setUsuarioParaAdicionar(null)}
      />
    </div>
  );
}

function ConteudoPatota() {
  const [amigos, setAmigos] = useState<AmigoDto[] | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [amigoAberto, setAmigoAberto] = useState<AmigoDto | null>(null);
  const [amigoParaRemover, setAmigoParaRemover] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  useEffect(() => {
    let ativo = true;
    obterAmigos()
      .then((resultado) => {
        if (ativo) setAmigos(resultado);
      })
      .catch(() => {
        if (ativo) setAmigos([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function desfazer(amigoId: string) {
    setAmigoParaRemover(null);
    setRemovendoId(amigoId);
    setErro(false);
    try {
      const resultado = await desfazerAmizade(amigoId);
      if (resultado.ok) {
        setAmigos((prev) => prev?.filter((a) => a.id !== amigoId) ?? prev);
        setAmigoAberto((atual) => (atual?.id === amigoId ? null : atual));
      } else {
        setErro(true);
      }
    } catch {
      setErro(true);
    } finally {
      setRemovendoId(null);
    }
  }

  const perfilAberto = amigoAberto
    ? {
        id: amigoAberto.id,
        name: amigoAberto.nome,
        image: amigoAberto.imagem,
        bio: amigoAberto.bio,
        temaFavorito: amigoAberto.temaFavorito,
        autorFavorito: amigoAberto.autorFavorito,
        livroIndicado: amigoAberto.livroIndicado,
        criadoEm: amigoAberto.criadoEm,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Minha Patota</h2>
        <p className="text-sm text-black/60">
          Os amigos que fazem parte da sua patota de leitura.
        </p>
      </div>

      {erro && (
        <p className="text-sm text-red-600">
          Não foi possível desfazer a amizade. Tente novamente.
        </p>
      )}

      {amigos === null ? (
        <p className="text-sm text-black/50">Carregando amigos...</p>
      ) : amigos.length === 0 ? (
        <p className="text-sm text-black/50">
          Você ainda não tem amigos. Busque leitores em Fantasmas e
          adicione-os à sua patota.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
          {amigos.map((amigo) => (
            <li
              key={amigo.id}
              className="flex items-center gap-2 px-4 py-3"
            >
              <button
                type="button"
                disabled={removendoId === amigo.id}
                onClick={() =>
                  setAmigoParaRemover({ id: amigo.id, nome: amigo.nome })
                }
                title="Desfazer amizade"
                aria-label={`Desfazer amizade com ${amigo.nome}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {removendoId === amigo.id ? (
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11h-6" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAmigoAberto(amigo)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left hover:bg-blue-50"
              >
                <ImagemUsuario
                  src={amigo.imagem}
                  alt={`Foto de ${amigo.nome}`}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium text-black">
                    {amigo.nome}
                  </span>
                  <span className="truncate text-sm text-black/60">
                    {amigo.bio?.trim() || "Sem bio."}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {perfilAberto && (
        <ModalPerfilUsuario
          usuario={perfilAberto}
          onFechar={() => setAmigoAberto(null)}
          rodape={
            <>
              {erro && (
                <p className="mb-2 text-sm text-red-600">
                  Não foi possível desfazer a amizade. Tente novamente.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex w-fit items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Faz parte da sua patota
                </span>
                <button
                  type="button"
                  disabled={removendoId === perfilAberto.id}
                  onClick={() =>
                    setAmigoParaRemover({
                      id: perfilAberto.id,
                      nome: perfilAberto.name,
                    })
                  }
                  className="flex w-fit items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {removendoId === perfilAberto.id ? (
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
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6" />
                    </svg>
                  )}
                  Desfazer amizade
                </button>
              </div>
            </>
          }
        />
      )}

      <ModalConfirmacao
        aberto={amigoParaRemover !== null}
        perigo
        titulo="Desfazer amizade"
        mensagem={`Você tem certeza que deseja desfazer a amizade com ${amigoParaRemover?.nome}?`}
        confirmando={
          amigoParaRemover !== null && removendoId === amigoParaRemover.id
        }
        rotuloConfirmar="Sim, desfazer"
        onConfirmar={() =>
          amigoParaRemover && desfazer(amigoParaRemover.id)
        }
        onCancelar={() => setAmigoParaRemover(null)}
      />
    </div>
  );
}

function ConteudoEditarPerfil({ onVoltar }: { onVoltar?: () => void }) {
  const { data, isPending } = useSession();
  const user = data?.user;
  const [nome, setNome] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [temaFavorito, setTemaFavorito] = useState(user?.temaFavorito ?? "");
  const [autorFavorito, setAutorFavorito] = useState(
    user?.autorFavorito ?? "",
  );
  const [livroIndicado, setLivroIndicado] = useState(
    user?.livroIndicado ?? "",
  );
  const [estado, setEstado] = useState<"idle" | "enviando" | "feito" | "erro">(
    "idle",
  );
  const [erro, setErro] = useState("");
  const [usuarioSincronizado, setUsuarioSincronizado] = useState(user);
  const [confirmarSalvar, setConfirmarSalvar] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(
    null,
  );
  const [erroImagem, setErroImagem] = useState("");
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement>(null);

  async function aoEscolherImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    setErroImagem("");
    setImagemSelecionada(null);
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErroImagem("Escolha um arquivo de imagem válido.");
      return;
    }
    if (arquivo.size > LIMITE_IMAGEM_PERFIL) {
      setErroImagem("Por enquanto só é possível enviar imagens de até 1 MB.");
      return;
    }
    setProcessandoImagem(true);
    try {
      setImagemSelecionada(await comprimirImagem(arquivo));
    } catch {
      setErroImagem(
        "Não foi possível processar a imagem. Tente novamente.",
      );
    } finally {
      setProcessandoImagem(false);
    }
  }

  if (user !== usuarioSincronizado) {
    setUsuarioSincronizado(user);
    setNome(user?.name ?? "");
    setEmail(user?.email ?? "");
    setBio(user?.bio ?? "");
    setTemaFavorito(user?.temaFavorito ?? "");
    setAutorFavorito(user?.autorFavorito ?? "");
    setLivroIndicado(user?.livroIndicado ?? "");
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const novoNome = nome.trim();
    if (!novoNome) {
      setErro("Informe um nome.");
      setEstado("erro");
      return;
    }
    const novoEmail = email.trim();
    if (!novoEmail) {
      setErro("Informe um e-mail.");
      setEstado("erro");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(novoEmail)) {
      setErro("Informe um e-mail válido.");
      setEstado("erro");
      return;
    }
    setErro("");
    setConfirmarSalvar(true);
  }

  async function salvarConfirmado() {
    setConfirmarSalvar(false);
    setEstado("enviando");
    setErro("");
    const novoEmail = email.trim();
    try {
      if (novoEmail.toLowerCase() !== (user?.email ?? "").toLowerCase()) {
        const { error } = await authClient.changeEmail({ newEmail: novoEmail });
        if (error) {
          setErro(
            error.status === 400 && /email.*same/i.test(error.message ?? "")
              ? "O novo e-mail deve ser diferente do atual."
              : `Erro ao alterar o e-mail (${error.status ?? "?"}): ${error.message ?? error.code ?? "erro interno"}`,
          );
          setEstado("erro");
          return;
        }
        const sessao = await authClient.getSession();
        if (
          sessao.data?.user.email.toLowerCase() !== novoEmail.toLowerCase()
        ) {
          setErro("Este e-mail já está em uso por outra conta.");
          setEstado("erro");
          return;
        }
      }
      const { error: errorPerfil } = await authClient.updateUser({
        name: nome.trim(),
        bio: bio.trim(),
        temaFavorito: temaFavorito.trim(),
        autorFavorito: autorFavorito.trim(),
        livroIndicado: livroIndicado.trim(),
        ...(imagemSelecionada ? { image: imagemSelecionada } : {}),
      });
      if (errorPerfil) {
        setErro(
          `Erro ao salvar (${errorPerfil.status ?? "?"}): ${errorPerfil.message ?? errorPerfil.code ?? "erro interno"}`,
        );
        setEstado("erro");
        return;
      }
      setEstado("feito");
      onVoltar?.();
    } catch {
      setErro("Erro inesperado ao atualizar o perfil. Tente novamente.");
      setEstado("erro");
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Alterar dados do perfil
        </h2>
        <p className="text-sm text-black/50">Carregando sessao...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Alterar dados do perfil
        </h2>
        <p className="text-sm text-black/50">
          Faca login para alterar seu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">
        Alterar dados do perfil
      </h2>

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <ImagemUsuario
            src={imagemSelecionada ?? user.image}
            alt={`Foto de ${user.name}`}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-black">Foto de perfil</span>
            <span className="text-xs text-black/50">
              JPG, PNG ou WebP, de até 1 MB. A imagem é compactada antes de ser
              salva.
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={processandoImagem}
            onClick={() => inputImagemRef.current?.click()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {processandoImagem
              ? "Processando..."
              : imagemSelecionada
                ? "Trocar foto"
                : "Escolher foto"}
          </button>
          {imagemSelecionada && (
            <button
              type="button"
              onClick={() => setImagemSelecionada(null)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-black hover:bg-blue-50"
            >
              Manter foto atual
            </button>
          )}
          <input
            ref={inputImagemRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={aoEscolherImagem}
          />
        </div>
        {erroImagem && <p className="text-sm text-red-600">{erroImagem}</p>}
        {imagemSelecionada && (
          <p className="text-sm text-green-700">
            Nova foto selecionada. Ela será salva ao confirmar as alterações.
          </p>
        )}
      </div>

      <form
        onSubmit={salvar}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-white p-4"
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
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-black">
            E-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <p className="text-xs text-black/50">
            Use o novo e-mail na próxima vez que entrar.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="text-sm font-medium text-black">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Conte um pouco sobre voce..."
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <p className="text-xs text-black/50">
            Até 500 caracteres ({bio.length}/500)
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="temaFavorito"
            className="text-sm font-medium text-black"
          >
            Tema favorito
          </label>
          <input
            id="temaFavorito"
            name="temaFavorito"
            type="text"
            value={temaFavorito}
            onChange={(event) => setTemaFavorito(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="autorFavorito"
            className="text-sm font-medium text-black"
          >
            Autor(a) favorito
          </label>
          <input
            id="autorFavorito"
            name="autorFavorito"
            type="text"
            value={autorFavorito}
            onChange={(event) => setAutorFavorito(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="livroIndicado"
            className="text-sm font-medium text-black"
          >
            Livro que indica
          </label>
          <input
            id="livroIndicado"
            name="livroIndicado"
            type="text"
            value={livroIndicado}
            onChange={(event) => setLivroIndicado(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        {estado === "feito" && (
          <p className="text-sm text-green-700">Perfil atualizado com sucesso!</p>
        )}
        {estado === "erro" && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={estado === "enviando"}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {estado === "enviando" ? "Salvando..." : "Salvar alterações"}
          </button>
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-blue-50"
            >
              Voltar
            </button>
          )}
        </div>
      </form>

      <ModalConfirmacao
        aberto={confirmarSalvar}
        titulo="Salvar alterações"
        mensagem="Você tem certeza que deseja salvar as alterações no seu perfil?"
        confirmando={estado === "enviando"}
        rotuloConfirmar="Sim, salvar"
        onConfirmar={salvarConfirmado}
        onCancelar={() => setConfirmarSalvar(false)}
      />
    </div>
  );
}

export function ConteudoSobre() {
  const administrador = useAdministrador();
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [editando, setEditando] = useState(false);
  const [estado, setEstado] = useState<
    "idle" | "salvando" | "feito" | "erro"
  >("idle");
  const [erro, setErro] = useState("");
  const [confirmarSalvar, setConfirmarSalvar] = useState(false);

  useEffect(() => {
    let ativo = true;
    obterSobre()
      .then((resultado) => {
        if (ativo) {
          setConteudo(resultado);
          setRascunho(resultado);
        }
      })
      .catch(() => {
        if (ativo) setConteudo("");
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function salvar() {
    setConfirmarSalvar(false);
    setEstado("salvando");
    setErro("");
    try {
      const resultado = await atualizarSobre(rascunho);
      if (resultado.ok) {
        setConteudo(rascunho.trim());
        setRascunho(rascunho.trim());
        setEditando(false);
        setEstado("feito");
      } else {
        setErro(resultado.erro ?? "Erro ao salvar o conteúdo.");
        setEstado("erro");
      }
    } catch {
      setErro("Erro inesperado ao salvar o conteúdo. Tente novamente.");
      setEstado("erro");
    }
  }

  function comecarEdicao() {
    setRascunho(conteudo ?? "");
    setErro("");
    setEstado("idle");
    setEditando(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Sobre o BooClubs
          </h2>
          
        </div>
        {administrador && !editando && (
          <span
            title="Ação exclusiva de administrador"
            className="flex items-center gap-1"
          >
            <ChaveIcon className="h-4 w-4 text-amber-600" />
            <button
              type="button"
              onClick={comecarEdicao}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Editar conteúdo
            </button>
          </span>
        )}
      </div>

      {estado === "feito" && (
        <p className="text-sm text-green-700">
          Conteúdo atualizado com sucesso!
        </p>
      )}
      {estado === "erro" && <p className="text-sm text-red-600">{erro}</p>}

      {conteudo === null ? (
        <p className="text-sm text-black/50">Carregando conteúdo...</p>
      ) : editando && administrador ? (
        <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4">
          <textarea
            value={rascunho}
            onChange={(event) => setRascunho(event.target.value)}
            rows={10}
            maxLength={10000}
            placeholder="Escreva o conteúdo da página Sobre..."
            className="rounded-md border border-black/15 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <p className="text-right text-xs text-black/50">
            {rascunho.length}/10000
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={estado === "salvando"}
              onClick={() => setConfirmarSalvar(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {estado === "salvando" ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              disabled={estado === "salvando"}
              onClick={() => {
                setEditando(false);
                setRascunho(conteudo ?? "");
                setErro("");
                setEstado("idle");
              }}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-blue-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : conteudo.trim() ? (
        <div className="rounded-lg border border-black/10 bg-white px-4 py-3">
          {conteudo.split("\n").map((paragrafo, indice) =>
            paragrafo.trim() ? (
              <p
                key={indice}
                className="text-sm leading-relaxed text-black/70 first:mt-0 [&:not(:first-child)]:mt-3"
              >
                {paragrafo}
              </p>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-black/50">
          {administrador
            ? "Nenhum conteúdo ainda. Clique em \u201cEditar conteúdo\u201d para escrever."
            : "Conteúdo em breve."}
        </p>
      )}

      <ModalConfirmacao
        aberto={confirmarSalvar}
        titulo="Salvar alterações"
        mensagem="Você tem certeza que deseja publicar este conteúdo na página Sobre?"
        confirmando={estado === "salvando"}
        rotuloConfirmar="Sim, publicar"
        onConfirmar={salvar}
        onCancelar={() => setConfirmarSalvar(false)}
      />
    </div>
  );
}

function ConteudoCadastro({ onCriado }: { onCriado?: () => void }) {
  const [estado, setEstado] = useState<
    "idle" | "enviando" | "feito" | "erro"
  >("idle");
  const [erro, setErro] = useState("");
  const [formAguardandoConfirmacao, setFormAguardandoConfirmacao] =
    useState<FormData | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setFormAguardandoConfirmacao(new FormData(event.currentTarget));
  }

  async function confirmarCriacao() {
    if (!formAguardandoConfirmacao) return;
    const formData = formAguardandoConfirmacao;
    setFormAguardandoConfirmacao(null);
    setEstado("enviando");
    setErro("");
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

      <ModalConfirmacao
        aberto={formAguardandoConfirmacao !== null}
        titulo="Cadastrar Clube de Leitura"
        mensagem={`Você tem certeza que deseja criar o clube "${String(formAguardandoConfirmacao?.get("nome") ?? "").trim() || "—"}"?`}
        confirmando={estado === "enviando"}
        rotuloConfirmar="Sim, criar"
        onConfirmar={confirmarCriacao}
        onCancelar={() => setFormAguardandoConfirmacao(null)}
      />
    </div>
  );
}

function ConteudoUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioListaDto[] | null>(null);
  const [usuarioParaEditar, setUsuarioParaEditar] =
    useState<UsuarioListaDto | null>(null);

  useEffect(() => {
    let ativo = true;
    obterUsuariosLista()
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
        <h2 className="text-2xl font-bold tracking-tight">
          Usuários Cadastrados
        </h2>
        <p className="text-sm text-black/60">
          Todos os usuários registrados no BooClubs.
        </p>
      </div>

      {usuarios === null ? (
        <p className="text-sm text-black/50">Carregando usuários...</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-black/50">Nenhum usuário cadastrado.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {usuarios.map((usuario) => (
            <li
              key={usuario.id}
              className="flex items-start gap-3 rounded-lg border border-black/10 bg-white p-3"
            >
              <ImagemUsuario
                src={usuario.image}
                alt={`Foto de ${usuario.name}`}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-black">
                    {usuario.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {usuario.clubes} clube(s)
                  </span>
                  <span
                    title="Ação exclusiva de administrador"
                    className="flex items-center gap-1"
                  >
                    <ChaveIcon className="h-4 w-4 text-amber-600" />
                    <button
                      type="button"
                      onClick={() => setUsuarioParaEditar(usuario)}
                      aria-label={`Alterar o cadastro do usuário ${usuario.name}`}
                      title="Alterar cadastro do usuário"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  </span>
                </div>
                <p className="text-sm text-black/60">
                  {usuario.bio?.trim() || "Sem bio."}
                </p>
                <div className="flex flex-col gap-0.5 text-xs text-black/50">
                  <span className="truncate">{usuario.email}</span>
                  {usuario.temaFavorito?.trim() && (
                    <span>Tema: {usuario.temaFavorito}</span>
                  )}
                  {usuario.autorFavorito?.trim() && (
                    <span>Autor(a): {usuario.autorFavorito}</span>
                  )}
                  {usuario.livroIndicado?.trim() && (
                    <span>Indica: {usuario.livroIndicado}</span>
                  )}
                </div>
                <span className="text-xs text-black/40">
                  Membro desde {formatarData(usuario.criadoEm)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {usuarioParaEditar && (
        <ModalEditarUsuario
          usuario={usuarioParaEditar}
          onFechar={() => setUsuarioParaEditar(null)}
          onSalvo={(atualizado) => {
            setUsuarios(
              (prev) =>
                prev?.map((u) =>
                  u.id === atualizado.id ? atualizado : u,
                ) ?? prev,
            );
            setUsuarioParaEditar(null);
          }}
        />
      )}
    </div>
  );
}

const CONTEUDO: Record<Exclude<MenuKey, "cadastrar" | "editar-perfil">, ReactNode> = {
  perfil: <ConteudoPerfil />,
  fantasmas: <ConteudoFantasmas />,
  patota: <ConteudoPatota />,
  clubes: <ConteudoClubes />,
  usuarios: <ConteudoUsuarios />,
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
        <Link
          href="/"
          onClick={() => onSelect("sobre")}
          className="flex items-center gap-2"
          aria-label="Ir para a página inicial"
        >
          <Image
            src="/booclubs_logo.png"
            alt="BooClubs"
            width={1377}
            height={1438}
            className="h-10 w-auto"
            priority
          />
          <span className="font-boo text-2xl font-bold tracking-tight text-blue-600">
            BooClubs
          </span>
        </Link>
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

function IconeMenu({
  item,
  className,
}: {
  item: { key: MenuKey; label: string };
  className: string;
}) {
  const comum = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  } as const;

  switch (item.key) {
    case "perfil":
      return (
        <svg {...comum}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "fantasmas":
      return (
        <svg {...comum}>
          <path d="M5 21v-12a7 7 0 0 1 14 0v12l-2.33-1.75-2.34 1.75L12 19.25 9.67 21l-2.34-1.75L5 21Z" />
          <circle cx="9.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "patota":
      return (
        <span
          className={`${className} block bg-current`}
          style={{
            maskImage: `url(${IMAGEM_PATOTA})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskImage: `url(${IMAGEM_PATOTA})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
          }}
          aria-hidden="true"
        />
      );
    case "clubes":
      return (
        <svg {...comum}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    default:
      return null;
  }
}

function BarraInferior({
  active,
  onSelect,
}: {
  active: MenuKey;
  onSelect: (key: MenuKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around gap-1 border-t border-black/10 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_6px_rgba(0,0,0,0.08)] md:hidden">
      {MENU_PRINCIPAL.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          aria-label={item.label}
          title={item.label}
          className={`flex flex-1 items-center justify-center rounded-xl py-2.5 transition-colors ${
            active === item.key ? CORES_BARRA[item.key].fundo : ""
          }`}
        >
          <span className={CORES_BARRA[item.key].texto}>
            <IconeMenu item={item} className="h-6 w-6" />
          </span>
        </button>
      ))}
    </nav>
  );
}

export function Dashboard() {
  const [active, setActive] = useState<MenuKey>("sobre");
  const [menuOpen, setMenuOpen] = useState(false);
  const administrador = useAdministrador();

  function select(key: MenuKey) {
    setActive(key);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <header className="relative flex items-center justify-center border-b border-black/10 bg-white px-4 py-3 md:hidden">
        <Link
          href="/"
          onClick={() => select("sobre")}
          className="flex items-center gap-2"
          aria-label="Ir para a página inicial"
        >
          <Image
            src="/booclubs_logo.png"
            alt="BooClubs"
            width={1377}
            height={1438}
            className="h-8 w-auto"
            priority
          />
          <span className="font-boo text-xl font-bold tracking-tight text-blue-600">
            BooClubs
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-black hover:bg-blue-50"
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

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-blue-50 pb-14 md:pb-0">
        <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-8 sm:pb-24 md:pb-8">
          {active === "cadastrar" ? (
            <ConteudoCadastro onCriado={() => select("clubes")} />
          ) : active === "editar-perfil" ? (
            <ConteudoEditarPerfil onVoltar={() => select("perfil")} />
          ) : active === "perfil" ? (
            <ConteudoPerfil onEditar={() => select("editar-perfil")} />
          ) : (
            CONTEUDO[active]
          )}
        </div>
        <UserStatus inline />
      </section>

      <BarraInferior active={active} onSelect={select} />
    </div>
  );
}