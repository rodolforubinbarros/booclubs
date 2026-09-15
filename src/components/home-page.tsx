import { Suspense } from "react";
import { adicionarTeste } from "@/server/actions";
import { listarTestes } from "@/server/db";
import { getHealthStatus } from "@/server/health";

async function ListaDeTestes() {
  const testes = await listarTestes();

  if (testes.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Nenhum nome ainda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {testes.map((teste) => (
        <li key={teste.id}>{teste.nome}</li>
      ))}
    </ul>
  );
}

export async function HomePage() {
  const health = getHealthStatus();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">booclubs</h1>
      <p className="text-sm text-black/50 dark:text-white/50">
        frontend connected · backend: {health.status}
      </p>
      <form action={adicionarTeste} className="flex items-center gap-2">
        <input
          name="nome"
          required
          placeholder="Digite um nome"
          className="rounded-md border border-black/20 px-3 py-2 text-sm dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Adicionar
        </button>
      </form>
      <Suspense
        fallback={
          <p className="text-sm text-black/50 dark:text-white/50">
            Carregando...
          </p>
        }
      >
        <ListaDeTestes />
      </Suspense>
    </main>
  );
}