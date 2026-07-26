import { AppShell } from "@/components/shared/app-shell";
import { requireUser } from "@/server/auth/require-user";
import { getRolloutPolicy } from "@/server/launch/rollout";

export const metadata = { robots: { index: false, follow: false } };

export default async function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  if (getRolloutPolicy().maintenance)
    return (
      <main className="bg-canvas min-h-screen px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">
          Scheduled maintenance
        </h1>
        <p className="text-secondary mx-auto mt-4 max-w-prose">
          The application workspace is temporarily unavailable. Durable work
          remains stored. Please return later.
        </p>
      </main>
    );
  return <AppShell user={user}>{children}</AppShell>;
}
