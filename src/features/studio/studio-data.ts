import type { ContentModule } from "@/generated/prisma/enums";
import { getServerEnv } from "@/lib/env/server";
import type { getPrisma } from "@/server/db/prisma";
import { createProjectRepository } from "@/server/repositories/project-repository";
import { builtinSkills } from "@/skills/builtin-skills";

import { STUDIO_MODULES } from "./studio-modules";

export { STUDIO_MODULES };

// Studio prototype (Creative AI Workspace direction): everything the home shows
// comes from the owner's data or the app's own configuration. Nothing is
// sample content, and nothing is shown as installed unless it is.

export type StudioProject = {
  id: string;
  name: string;
  brandName: string;
  status: string;
  updatedAt: Date;
  modules: ContentModule[];
  contentCount: number;
};

export type ServerAiStatus =
  | { kind: "mock" }
  | { kind: "external"; provider: string }
  | { kind: "local-runtime"; model: string | null };

export type StudioSkill = { id: string; title: string; description: string };

export type StudioData = {
  localMode: boolean;
  projects: StudioProject[];
  skills: StudioSkill[];
  ai: ServerAiStatus;
};

function serverAiStatus(): ServerAiStatus {
  const env = getServerEnv();
  if (!env.AI_REAL_GENERATION_ENABLED) return { kind: "mock" };
  if (env.AI_PROVIDER_DEFAULT === "LOCAL")
    return { kind: "local-runtime", model: env.AI_OLLAMA_MODEL || null };
  if (env.AI_PROVIDER_DEFAULT === "OPENAI")
    return { kind: "external", provider: "OpenAI" };
  return { kind: "mock" };
}

export async function loadStudioData(
  prisma: ReturnType<typeof getPrisma>,
  userId: string,
): Promise<StudioData> {
  const summaries = await createProjectRepository(prisma).listOwned(userId, 12);
  const ids = summaries.map((project) => project.id);
  const [modules, counts, skills] = await Promise.all([
    prisma.projectModule.findMany({
      where: { projectId: { in: ids }, project: { userId } },
      select: { projectId: true, module: true },
    }),
    prisma.contentItem.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, project: { userId } },
      _count: { _all: true },
    }),
    builtinSkills(),
  ]);
  const order = STUDIO_MODULES.map((entry) => entry.module);
  return {
    localMode: getServerEnv().APP_MODE === "local",
    projects: summaries.map((project) => ({
      id: project.id,
      name: project.name,
      brandName: project.brandName,
      status: project.status,
      updatedAt: project.updatedAt,
      modules: modules
        .filter((entry) => entry.projectId === project.id)
        .map((entry) => entry.module)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      contentCount:
        counts.find((entry) => entry.projectId === project.id)?._count._all ??
        0,
    })),
    skills: skills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      description: skill.description,
    })),
    ai: serverAiStatus(),
  };
}
