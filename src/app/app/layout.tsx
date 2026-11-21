import { cookies } from "next/headers";

import { AppShell } from "@/components/shared/app-shell";
import { studioCommands } from "@/features/studio/commands";
import { THEME_COOKIE, parseTheme } from "@/features/theme/theme";
import { getServerEnv } from "@/lib/env/server";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
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
  const localMode = getServerEnv().APP_MODE === "local";
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  // The command bar opens real projects and their modules (doc 55, S2).
  const projects = await getPrisma().project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      brandName: true,
      modules: { select: { module: true } },
    },
  });
  const commands = studioCommands({
    localMode,
    projects: projects.map((project) => ({
      ...project,
      modules: project.modules.map((entry) => entry.module),
    })),
  });
  return (
    <AppShell
      commands={commands}
      localMode={localMode}
      theme={theme}
      user={user}
    >
      {children}
    </AppShell>
  );
}
