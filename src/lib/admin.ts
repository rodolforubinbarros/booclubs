export const EMAIL_DO_ADMINISTRADOR = "rodolfo.rubin@gmail.com";

export function EmailDeAdministrador(
  email: string | null | undefined,
): boolean {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase() === EMAIL_DO_ADMINISTRADOR.toLowerCase()
  );
}