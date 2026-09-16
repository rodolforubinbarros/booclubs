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
  plugins: [nextCookies()],
});