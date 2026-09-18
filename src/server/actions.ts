"use server";

import { headers } from "next/headers";
import { EmailDeAdministrador } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  adicionarAmizade,
  adicionarMembro,
  atualizarClube,
  atualizarUsuario,
  criarClubeComDono,
  criarTeste,
  deletarClube,
  listarAmigos,
  listarClubes,
  listarClubesDoUsuario,
  listarMembrosDoClube,
  listarUsuarios,
  listarUsuariosLista,
  listarUsuariosPorBusca,
  obterConteudoSobre,
  obterPapel,
  removerAmizade,
  removerMembro,
  salvarConteudoSobre,
  transferirDono,
  type Amigo,
  type ClubeDoUsuario,
  type ClubeLeitura,
  type ClubeVisivel,
  type Usuario,
  type UsuarioLista,
  type UsuarioPerfil,
} from "./db";

export async function adicionarTeste(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  await criarTeste(crypto.randomUUID(), nome);
}

export type UsuarioDto = {
  id: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
};

export type ClubeLeituraDto = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  genero: string | null;
  local: string | null;
  link: string | null;
  dono_id: string | null;
  dono_nome: string | null;
  criadoEm: string | null;
  membros: number;
};

export type ClubeDoUsuarioDto = ClubeLeituraDto & {
  papel: string;
};

export type ClubeVisivelDto = ClubeLeituraDto & {
  sou_membro: boolean;
};

async function obterSessao() {
  return auth.api.getSession({ headers: await headers() });
}

export async function souAdministrador(): Promise<boolean> {
  const sessao = await obterSessao();
  return EmailDeAdministrador(sessao?.user?.email);
}

function serializarUsuario(usuario: Usuario): UsuarioDto {
  return {
    ...usuario,
    createdAt: usuario.createdAt.toISOString(),
  };
}

function serializarClube(clube: ClubeLeitura): ClubeLeituraDto {
  const { criado_em, ...resto } = clube;
  return {
    ...resto,
    criadoEm: criado_em ? new Date(criado_em).toISOString() : null,
  };
}

export async function obterUsuarios(): Promise<UsuarioDto[]> {
  return (await listarUsuarios()).map(serializarUsuario);
}

export type UsuarioListaDto = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  temaFavorito: string | null;
  autorFavorito: string | null;
  livroIndicado: string | null;
  criadoEm: string;
  clubes: number;
};

export async function obterUsuariosLista(): Promise<UsuarioListaDto[]> {
  if (!(await souAdministrador())) return [];
  return (await listarUsuariosLista()).map((usuario: UsuarioLista) => ({
    id: usuario.id,
    name: usuario.name,
    email: usuario.email,
    image: usuario.image,
    bio: usuario.bio,
    temaFavorito: usuario.temaFavorito,
    autorFavorito: usuario.autorFavorito,
    livroIndicado: usuario.livroIndicado,
    criadoEm: usuario.criado_em.toISOString(),
    clubes: usuario.clubes,
  }));
}

export type UsuarioPerfilDto = {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  temaFavorito: string | null;
  autorFavorito: string | null;
  livroIndicado: string | null;
  criadoEm: string;
};

export async function obterUsuariosPorBusca(
  busca: string,
): Promise<UsuarioPerfilDto[]> {
  return (await listarUsuariosPorBusca(busca)).map((usuario: UsuarioPerfil) => ({
    id: usuario.id,
    name: usuario.name,
    image: usuario.image,
    bio: usuario.bio,
    temaFavorito: usuario.temaFavorito,
    autorFavorito: usuario.autorFavorito,
    livroIndicado: usuario.livroIndicado,
    criadoEm: usuario.createdAt.toISOString(),
  }));
}

export async function obterClubes(busca: string): Promise<ClubeVisivelDto[]> {
  const sessao = await obterSessao();
  const userId = sessao?.user?.id ?? null;
  return (await listarClubes(busca, userId)).map((clube: ClubeVisivel) => ({
    ...serializarClube(clube),
    sou_membro: clube.sou_membro,
  }));
}

export async function obterClubesDoUsuario(
  userId: string,
): Promise<ClubeDoUsuarioDto[]> {
  return (await listarClubesDoUsuario(userId)).map(
    (clube: ClubeDoUsuario) => ({
      ...serializarClube(clube),
      papel: clube.papel,
    }),
  );
}

export type MembroDoClubeDto = {
  id: string;
  nome: string;
  imagem: string | null;
  papel: string;
};

export async function obterMembrosDoClube(
  clubeId: string,
): Promise<MembroDoClubeDto[]> {
  return listarMembrosDoClube(clubeId);
}

export async function criarClube(dados: {
  nome: string;
  descricao: string;
  genero: string;
  local: string;
  link: string;
}): Promise<{ ok?: boolean; erro?: string }> {
  try {
    const sessao = await obterSessao();
    const userId = sessao?.user?.id;
    if (!userId) return { erro: "Faça login para criar um clube." };

    const nome = dados.nome.trim();
    if (!nome) return { erro: "Informe o nome do clube." };
    const descricao = dados.descricao.trim() || null;
    const genero = dados.genero.trim() || null;
    const local = dados.local.trim() || null;
    const link = dados.link.trim() || null;

    const id = crypto.randomUUID();
    await criarClubeComDono({
      id,
      nome,
      descricao,
      genero,
      local,
      link,
      donoId: userId,
    });
    return { ok: true };
  } catch (erro) {
    console.error("[criarClube]", erro);
    return { erro: "Erro inesperado ao criar o clube. Tente novamente." };
  }
}

export async function excluirClube(
  clubeId: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!(await souAdministrador())) {
      return { ok: false, erro: "Sem permissão para excluir clubes." };
    }
    await deletarClube(clubeId);
    return { ok: true };
  } catch (erro) {
    console.error("[excluirClube]", erro);
    return { ok: false, erro: "Erro inesperado ao excluir o clube." };
  }
}

export async function editarClube(
  clubeId: string,
  dados: {
    nome: string;
    descricao: string;
    genero: string;
    local: string;
    link: string;
    imagem: string | null;
  },
): Promise<{ ok?: boolean; erro?: string }> {
  try {
    if (!(await souAdministrador())) {
      return { ok: false, erro: "Sem permissão para editar clubes." };
    }
    const nome = dados.nome.trim();
    if (!nome) return { erro: "Informe o nome do clube." };
    const descricao = dados.descricao.trim() || null;
    const genero = dados.genero.trim() || null;
    const local = dados.local.trim() || null;
    const link = dados.link.trim() || null;
    let imagem: string | null = null;
    if (dados.imagem) {
      if (!dados.imagem.startsWith("data:image/")) {
        return { erro: "Imagem inválida." };
      }
      if (dados.imagem.length > 2 * 1024 * 1024) {
        return { erro: "Imagem muito grande. Envie uma imagem de até 1 MB." };
      }
      imagem = dados.imagem;
    }
    await atualizarClube(clubeId, {
      nome,
      descricao,
      genero,
      local,
      link,
      imagem,
    });
    return { ok: true };
  } catch (erro) {
    console.error("[editarClube]", erro);
    return { erro: "Erro inesperado ao editar o clube. Tente novamente." };
  }
}

export async function editarUsuario(
  userId: string,
  dados: {
    nome: string;
    email: string;
    bio: string;
    temaFavorito: string;
    autorFavorito: string;
    livroIndicado: string;
    imagem: string | null;
  },
): Promise<{ ok?: boolean; erro?: string }> {
  try {
    if (!(await souAdministrador())) {
      return { ok: false, erro: "Sem permissão para editar usuários." };
    }
    const nome = dados.nome.trim();
    if (!nome) return { erro: "Informe um nome." };
    const email = dados.email.trim();
    if (!email) return { erro: "Informe um e-mail." };
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { erro: "Informe um e-mail válido." };
    }
    const bio = dados.bio.trim() || null;
    const temaFavorito = dados.temaFavorito.trim() || null;
    const autorFavorito = dados.autorFavorito.trim() || null;
    const livroIndicado = dados.livroIndicado.trim() || null;
    let imagem: string | null = null;
    if (dados.imagem) {
      if (!dados.imagem.startsWith("data:image/")) {
        return { erro: "Imagem inválida." };
      }
      if (dados.imagem.length > 2 * 1024 * 1024) {
        return { erro: "Imagem muito grande. Envie uma imagem de até 1 MB." };
      }
      imagem = dados.imagem;
    }
    await atualizarUsuario(userId, {
      name: nome,
      email,
      bio,
      temaFavorito,
      autorFavorito,
      livroIndicado,
      imagem,
    });
    return { ok: true };
  } catch (erro) {
    console.error("[editarUsuario]", erro);
    if (
      erro &&
      typeof erro === "object" &&
      "code" in erro &&
      (erro as { code: string }).code === "23505"
    ) {
      return { erro: "Este e-mail já está em uso por outra conta." };
    }
    return { erro: "Erro inesperado ao editar o usuário. Tente novamente." };
  }
}

export async function entrarNoClube(clubeId: string): Promise<{ ok: boolean }> {
  try {
    const sessao = await obterSessao();
    const userId = sessao?.user?.id;
    if (!userId) return { ok: false };
    await adicionarMembro(clubeId, userId, "membro");
    return { ok: true };
  } catch (erro) {
    console.error("[entrarNoClube]", erro);
    return { ok: false };
  }
}

export async function sairDoClube(clubeId: string): Promise<{ ok: boolean }> {
  try {
    const sessao = await obterSessao();
    const userId = sessao?.user?.id;
    if (!userId) return { ok: false };
    const papel = await obterPapel(clubeId, userId);
    if (!papel) return { ok: false };
    await removerMembro(clubeId, userId);
    if (papel === "dono") {
      await transferirDono(clubeId);
    }
    return { ok: true };
  } catch (erro) {
    console.error("[sairDoClube]", erro);
    return { ok: false };
  }
}

export type AmigoDto = {
  id: string;
  nome: string;
  imagem: string | null;
  bio: string | null;
  temaFavorito: string | null;
  autorFavorito: string | null;
  livroIndicado: string | null;
  criadoEm: string;
};

export async function obterAmigos(): Promise<AmigoDto[]> {
  const sessao = await obterSessao();
  const userId = sessao?.user?.id;
  if (!userId) return [];
  return (await listarAmigos(userId)).map((amigo: Amigo) => ({
    id: amigo.id,
    nome: amigo.nome,
    imagem: amigo.imagem,
    bio: amigo.bio,
    temaFavorito: amigo.temaFavorito,
    autorFavorito: amigo.autorFavorito,
    livroIndicado: amigo.livroIndicado,
    criadoEm: amigo.criado_em.toISOString(),
  }));
}

export async function adicionarAmigo(
  amigoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const sessao = await obterSessao();
    const userId = sessao?.user?.id;
    if (!userId) return { ok: false, erro: "Faça login para adicionar amigos." };
    if (userId === amigoId) {
      return { ok: false, erro: "Você não pode adicionar a si mesmo." };
    }
    await adicionarAmizade(userId, amigoId);
    return { ok: true };
  } catch (erro) {
    console.error("[adicionarAmigo]", erro);
    return { ok: false, erro: "Erro inesperado ao adicionar o amigo." };
  }
}

export async function desfazerAmizade(
  amigoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const sessao = await obterSessao();
    const userId = sessao?.user?.id;
    if (!userId) return { ok: false, erro: "Faça login para desfazer a amizade." };
    await removerAmizade(userId, amigoId);
    return { ok: true };
  } catch (erro) {
    console.error("[desfazerAmizade]", erro);
    return { ok: false, erro: "Erro inesperado ao desfazer a amizade." };
  }
}

export async function obterSobre(): Promise<string> {
  return obterConteudoSobre();
}

export async function atualizarSobre(
  conteudo: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!(await souAdministrador())) {
      return { ok: false, erro: "Sem permissão para editar este conteúdo." };
    }
    const texto = conteudo.trim();
    if (!texto) {
      return { ok: false, erro: "O conteúdo não pode ficar vazio." };
    }
    if (texto.length > 10000) {
      return {
        ok: false,
        erro: "O conteúdo excede o limite de 10.000 caracteres.",
      };
    }
    await salvarConteudoSobre(texto);
    return { ok: true };
  } catch (erro) {
    console.error("[atualizarSobre]", erro);
    return { ok: false, erro: "Erro inesperado ao salvar o conteúdo." };
  }
}