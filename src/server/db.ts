import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL não configurada. Rode `npx vercel env pull .env.local` ou configure no painel da Vercel/Neon.",
  );
}

export const sql = postgres(connectionString, { max: 1 });

export type Teste = { id: number; chave: string; nome: string };

export async function listarTestes() {
  return sql<Teste[]>`SELECT id, chave, nome FROM testes ORDER BY criado_em DESC`;
}

export async function criarTeste(chave: string, nome: string) {
  return sql`INSERT INTO testes (chave, nome) VALUES (${chave}, ${nome})`;
}

export type Usuario = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
};

export type ClubeLeitura = {
  id: string;
  nome: string;
  descricao: string | null;
  genero: string | null;
  local: string | null;
  link: string | null;
  dono_id: string | null;
  dono_nome: string | null;
  criado_em: Date | null;
  membros: number;
};

export type ClubeDoUsuario = ClubeLeitura & {
  papel: string;
};

export async function listarUsuarios(): Promise<Usuario[]> {
  return sql<Usuario[]>`
    SELECT id, name, email, "emailVerified", image, "createdAt"
    FROM "user"
    ORDER BY "createdAt" ASC
  `;
}

export async function listarClubes(busca = ""): Promise<ClubeLeitura[]> {
  const termo = `%${busca.trim()}%`;

  if (!busca.trim()) {
    return sql<ClubeLeitura[]>`
      SELECT
        c.id,
        c.nome,
        c.descricao,
        c.genero,
        c.local,
        c.link,
        c.dono_id,
        u.name AS dono_nome,
        c.criado_em,
        (
          SELECT count(*)::int
          FROM clube_membros m
          WHERE m.clube_id = c.id
        ) AS membros
      FROM clubes c
      LEFT JOIN "user" u ON u.id = c.dono_id
      ORDER BY c.nome ASC
    `;
  }

  return sql<ClubeLeitura[]>`
    SELECT
      c.id,
      c.nome,
      c.descricao,
      c.genero,
      c.local,
      c.link,
      c.dono_id,
      u.name AS dono_nome,
      c.criado_em,
      (
        SELECT count(*)::int
        FROM clube_membros m
        WHERE m.clube_id = c.id
      ) AS membros
    FROM clubes c
    LEFT JOIN "user" u ON u.id = c.dono_id
    WHERE c.nome ILIKE ${termo}
       OR c.descricao ILIKE ${termo}
       OR c.genero ILIKE ${termo}
       OR c.local ILIKE ${termo}
       OR u.name ILIKE ${termo}
    ORDER BY c.nome ASC
  `;
}

export async function listarClubesDoUsuario(userId: string): Promise<ClubeDoUsuario[]> {
  return sql<ClubeDoUsuario[]>`
    SELECT
      c.id,
      c.nome,
      c.descricao,
      c.genero,
      c.local,
      c.link,
      c.dono_id,
      u.name AS dono_nome,
      c.criado_em,
      (
        SELECT count(*)::int
        FROM clube_membros m
        WHERE m.clube_id = c.id
      ) AS membros,
      m.papel
    FROM clube_membros m
    JOIN clubes c ON c.id = m.clube_id
    LEFT JOIN "user" u ON u.id = c.dono_id
    WHERE m.user_id = ${userId}
    ORDER BY c.nome ASC
  `;
}