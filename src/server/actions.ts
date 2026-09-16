"use server";

import { revalidatePath } from "next/cache";
import {
  criarTeste,
  listarClubes,
  listarClubesDoUsuario,
  listarMembrosDoClube,
  listarUsuarios,
  type ClubeLeitura,
  type ClubeDoUsuario,
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
  email: string;
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

export async function obterClubes(busca: string): Promise<ClubeLeituraDto[]> {
  return (await listarClubes(busca)).map(serializarClube);
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
  email: string;
  papel: string;
};

export async function obterMembrosDoClube(
  clubeId: string,
): Promise<MembroDoClubeDto[]> {
  return listarMembrosDoClube(clubeId);
}