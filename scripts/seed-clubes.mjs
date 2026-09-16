import postgres from "postgres";
import crypto from "node:crypto";

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL, {
  max: 1,
});

async function main() {
  await sql`alter table "clubes" add column if not exists "genero" text`;
  await sql`alter table "clubes" add column if not exists "local" text`;
  await sql`alter table "clubes" add column if not exists "link" text`;

  await sql`delete from "clube_membros"`;
  await sql`delete from "clubes"`;

  const usuarios = await sql`select id, email from "user"`;
  const [dono] = usuarios;
  const donoId = dono?.id ?? null;

  const id = crypto.randomUUID();

  await sql`
    insert into "clubes" ("id", "nome", "descricao", "genero", "local", "link", "dono_id")
    values (
      ${id},
      ${"Livro, Prosa & Cia"},
      ${"Os encontros acontecem uma vez por mês, sempre aos sábados às 15h, com local a definir."},
      ${"Temas variados"},
      ${"A definir"},
      ${"https://www.instagram.com/livroprosaecia"},
      ${donoId}
    )
    on conflict ("id") do nothing
  `;
  console.log("Clube de leitura 'Livro, Prosa & Cia' inserido.");

  const registros = [];
  if (donoId) registros.push([id, donoId, "dono"]);
  const outros = usuarios.filter((u) => u.id !== donoId);
  outros.forEach((usuario) => {
    registros.push([id, usuario.id, "membro"]);
  });

  for (const [clubeId, userId, papel] of registros) {
    await sql`
      insert into "clube_membros" ("clube_id", "user_id", "papel")
      values (${clubeId}, ${userId}, ${papel})
      on conflict ("clube_id", "user_id") do nothing
    `;
  }
  console.log(`Vínculos de membros criados: ${registros.length}.`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});