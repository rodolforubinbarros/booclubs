create table "amizades" (
  "usuario_id" text not null references "user" ("id") on delete cascade,
  "amigo_id" text not null references "user" ("id") on delete cascade,
  "criado_em" timestamptz default CURRENT_TIMESTAMP not null,
  primary key ("usuario_id", "amigo_id"),
  constraint "amizades_ordem" check ("usuario_id" < "amigo_id")
);