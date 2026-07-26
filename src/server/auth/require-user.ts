import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";

export type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string;
};

export async function requireUser(
  returnTo = "/app",
): Promise<AuthenticatedUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    const safeReturnTo = returnTo.startsWith("/app") ? returnTo : "/app";
    redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`);
  }
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
  };
}
