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
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
};

export type ClubeLeitura = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
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

export type ClubeVisivel = ClubeLeitura & {
  sou_membro: boolean;
};

export async function listarUsuarios(): Promise<Usuario[]> {
  return sql<Usuario[]>`
    SELECT id, name, "emailVerified", image, "createdAt"
    FROM "user"
    ORDER BY "createdAt" ASC
  `;
}

export type UsuarioPerfil = {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  temaFavorito: string | null;
  autorFavorito: string | null;
  livroIndicado: string | null;
  createdAt: Date;
};

export async function listarUsuariosPorBusca(
  busca: string,
): Promise<UsuarioPerfil[]> {
  if (!busca.trim()) {
    return sql<UsuarioPerfil[]>`
      SELECT id, name, image, bio, "temaFavorito", "autorFavorito", "livroIndicado", "createdAt"
      FROM "user"
      ORDER BY name ASC
    `;
  }

  const termo = `%${busca.trim()}%`;
  return sql<UsuarioPerfil[]>`
    SELECT id, name, image, bio, "temaFavorito", "autorFavorito", "livroIndicado", "createdAt"
    FROM "user"
    WHERE name ILIKE ${termo}
       OR bio ILIKE ${termo}
       OR "temaFavorito" ILIKE ${termo}
       OR "autorFavorito" ILIKE ${termo}
       OR "livroIndicado" ILIKE ${termo}
    ORDER BY name ASC
  `;
}

export async function listarClubes(
  busca = "",
  userId: string | null = null,
): Promise<ClubeVisivel[]> {
  const termo = `%${busca.trim()}%`;

  if (!busca.trim()) {
    return sql<ClubeVisivel[]>`
      SELECT
        c.id,
        c.nome,
        c.descricao,
        c.imagem,
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
        EXISTS(
          SELECT 1
          FROM clube_membros m
          WHERE m.clube_id = c.id AND m.user_id = ${userId}
        ) AS sou_membro
      FROM clubes c
      LEFT JOIN "user" u ON u.id = c.dono_id
      ORDER BY c.nome ASC
    `;
  }

  return sql<ClubeVisivel[]>`
    SELECT
      c.id,
      c.nome,
      c.descricao,
      c.imagem,
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
      EXISTS(
        SELECT 1
        FROM clube_membros m
        WHERE m.clube_id = c.id AND m.user_id = ${userId}
      ) AS sou_membro
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
      c.imagem,
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

export type MembroDoClube = {
  id: string;
  nome: string;
  imagem: string | null;
  papel: string;
};

export async function listarMembrosDoClube(clubeId: string): Promise<MembroDoClube[]> {
  return sql<MembroDoClube[]>`
    SELECT u.id, u.name AS nome, u.image AS imagem, m.papel
    FROM clube_membros m
    JOIN "user" u ON u.id = m.user_id
    WHERE m.clube_id = ${clubeId}
    ORDER BY u.name ASC
  `;
}

export async function criarClubeComDono(dados: {
  id: string;
  nome: string;
  descricao: string | null;
  genero: string | null;
  local: string | null;
  link: string | null;
  donoId: string;
}) {
  return sql.begin(async (tx) => {
    await tx`
      INSERT INTO clubes (id, nome, descricao, genero, local, link, dono_id, criado_em)
      VALUES (${dados.id}, ${dados.nome}, ${dados.descricao}, ${dados.genero}, ${dados.local}, ${dados.link}, ${dados.donoId}, ${new Date()})
    `;
    await tx`
      INSERT INTO clube_membros (clube_id, user_id, papel)
      VALUES (${dados.id}, ${dados.donoId}, 'dono')
      ON CONFLICT ("clube_id", "user_id") DO NOTHING
    `;
  });
}

export async function adicionarMembro(
  clubeId: string,
  userId: string,
  papel: string,
) {
  return sql`
    INSERT INTO clube_membros (clube_id, user_id, papel)
    VALUES (${clubeId}, ${userId}, ${papel})
    ON CONFLICT ("clube_id", "user_id") DO NOTHING
  `;
}

export async function removerMembro(clubeId: string, userId: string) {
  return sql`DELETE FROM clube_membros WHERE clube_id = ${clubeId} AND user_id = ${userId}`;
}

export async function deletarClube(clubeId: string) {
  return sql.begin(async (tx) => {
    await tx`DELETE FROM clube_membros WHERE clube_id = ${clubeId}`;
    await tx`DELETE FROM clubes WHERE id = ${clubeId}`;
  });
}

export async function transferirDono(clubeId: string) {
  const [proximo] = await sql<{ user_id: string }[]>`
    SELECT m.user_id
    FROM clube_membros m
    WHERE m.clube_id = ${clubeId}
    ORDER BY (m.papel = 'dono') DESC, m.user_id ASC
    LIMIT 1
  `;
  return sql`
    UPDATE clubes SET dono_id = ${proximo?.user_id ?? null}
    WHERE id = ${clubeId}
  `;
}

export async function obterPapel(
  clubeId: string,
  userId: string,
): Promise<string | null> {
  const [linha] = await sql<{ papel: string }[]>`
    SELECT papel FROM clube_membros
    WHERE clube_id = ${clubeId} AND user_id = ${userId}
  `;
  return linha?.papel ?? null;
}