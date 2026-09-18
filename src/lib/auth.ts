import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PostgresJSDialect } from "kysely-postgres-js";
import { sql } from "@/server/db";

export const auth = betterAuth({
  database: {
    dialect: new PostgresJSDialect({ postgres: sql }),
    type: "postgres",
    casing: "camel",
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    additionalFields: {
      bio: { type: "string", required: false },
      temaFavorito: { type: "string", required: false },
      autorFavorito: { type: "string", required: false },
      livroIndicado: { type: "string", required: false },
    },
  },
  plugins: [nextCookies()],
});