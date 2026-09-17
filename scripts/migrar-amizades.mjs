import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL, {
  max: 1,
});

async function main() {
  await sql`
    create table if not exists "amizades" (
      "usuario_id" text not null references "user" ("id") on delete cascade,
      "amigo_id" text not null references "user" ("id") on delete cascade,
      "criado_em" timestamptz default CURRENT_TIMESTAMP not null,
      primary key ("usuario_id", "amigo_id"),
      constraint "amizades_ordem" check ("usuario_id" < "amigo_id")
    )
  `;
  console.log("Tabela 'amizades' criada/atualizada.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});