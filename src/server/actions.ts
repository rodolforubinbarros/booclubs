"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  adicionarMembro,
  criarClubeNoBanco,
  criarTeste,
  listarClubes,
  listarClubesDoUsuario,
  listarMembrosDoClube,
  listarUsuarios,
  obterPapel,
  removerMembro,
  transferirDono,
  type ClubeDoUsuario,
  type ClubeLeitura,
  type ClubeVisivel,
  type Usuario,
} from "./db";

export async function adicionarTeste(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  await criarTeste(crypto.randomUUID(), nome);
  revalidatePath("/");
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
  papel: string;
};

export async function obterMembrosDoClube(
  clubeId: string,
): Promise<MembroDoClubeDto[]> {
  return listarMembrosDoClube(clubeId);
}

export async function criarClube(
  formData: FormData,
): Promise<{ ok?: boolean; erro?: string }> {
  const sessao = await obterSessao();
  const userId = sessao?.user?.id;
  if (!userId) return { erro: "Faça login para criar um clube." };

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do clube." };
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const genero = String(formData.get("genero") ?? "").trim() || null;
  const local = String(formData.get("local") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;

  const id = randomUUID();
  await criarClubeNoBanco({ id, nome, descricao, genero, local, link, donoId: userId });
  await adicionarMembro(id, userId, "dono");
  revalidatePath("/");
  return { ok: true };
}

export async function entrarNoClube(clubeId: string): Promise<{ ok: boolean }> {
  const sessao = await obterSessao();
  const userId = sessao?.user?.id;
  if (!userId) return { ok: false };
  await adicionarMembro(clubeId, userId, "membro");
  revalidatePath("/");
  return { ok: true };
}

export async function sairDoClube(clubeId: string): Promise<{ ok: boolean }> {
  const sessao = await obterSessao();
  const userId = sessao?.user?.id;
  if (!userId) return { ok: false };
  const papel = await obterPapel(clubeId, userId);
  if (!papel) return { ok: false };
  await removerMembro(clubeId, userId);
  if (papel === "dono") {
    await transferirDono(clubeId);
  }
  revalidatePath("/");
  return { ok: true };
}