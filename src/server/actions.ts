"use server";

import { revalidatePath } from "next/cache";
import { criarTeste } from "./db";

export async function adicionarTeste(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  await criarTeste(crypto.randomUUID(), nome);
  revalidatePath("/");
}