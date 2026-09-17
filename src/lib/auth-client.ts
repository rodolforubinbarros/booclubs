import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        bio: { type: "string", required: false },
        temaFavorito: { type: "string", required: false },
        autorFavorito: { type: "string", required: false },
        livroIndicado: { type: "string", required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;