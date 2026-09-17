"use client";

import { useSession } from "@/lib/auth-client";
import { EmailDeAdministrador } from "@/lib/admin";

export function useAdministrador(): boolean {
  return EmailDeAdministrador(useSession().data?.user?.email);
}