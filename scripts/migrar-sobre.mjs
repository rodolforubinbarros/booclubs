import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL, {
  max: 1,
});

async function main() {
  await sql`
    create table if not exists "sobre" (
      "id" text primary key,
      "conteudo" text not null,
      "atualizado_em" timestamptz default CURRENT_TIMESTAMP not null
    )
  `;
  await sql`
    insert into "sobre" ("id", "conteudo")
    values ('sobre', ${"Em breve, você encontrará aqui a história do BooClubs."})
    on conflict ("id") do nothing
  `;
  console.log("Tabela 'sobre' criada/atualizada.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});