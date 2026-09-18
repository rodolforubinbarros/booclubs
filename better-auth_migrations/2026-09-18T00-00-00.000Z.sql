create table if not exists "sobre" (
  "id" text primary key,
  "conteudo" text not null,
  "atualizado_em" timestamptz default CURRENT_TIMESTAMP not null
);

insert into "sobre" ("id", "conteudo")
values ('sobre', 'Em breve, você encontrará aqui a história do BooClubs.')
on conflict ("id") do nothing;