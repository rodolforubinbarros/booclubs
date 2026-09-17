"use server";

import { headers } from "next/headers";
import { EmailDeAdministrador } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  adicionarMembro,
  criarClubeComDono,
  criarTeste,
  deletarClube,
  listarClubes,
  listarClubesDoUsuario,
  listarMembrosDoClube,
  listarUsuarios,
  listarUsuariosPorBusca,
  obterPapel,
  removerMembro,
  transferirDono,
  type ClubeDoUsuario,
  type ClubeLeitura,
  type ClubeVisivel,
  type Usuario,
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