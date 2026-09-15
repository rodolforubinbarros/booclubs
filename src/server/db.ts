import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL não configurada. Rode `npx vercel env pull .env.local` ou configure no painel da Vercel/Neon.",
  );
}

const sql = postgres(connectionString, { max: 1 });

export type Teste = { id: number; chave: string; nome: string };

export async function listarTestes() {
  return sql<Teste[]>`SELECT id, chave, nome FROM testes ORDER BY criado_em DESC`;
}

export async function criarTeste(chave: string, nome: string) {
  return sql`INSERT INTO testes (chave, nome) VALUES (${chave}, ${nome})`;
}