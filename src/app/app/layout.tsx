import { AppShell } from "@/components/shared/app-shell";
import { requireUser } from "@/server/auth/require-user";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
