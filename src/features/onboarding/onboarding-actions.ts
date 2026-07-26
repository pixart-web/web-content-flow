"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";

export async function continueOnboardingAction() {
  const user = await requireUser("/app/onboarding");
  const prisma = getPrisma();
  const draft = await prisma.project.findFirst({
    where: { userId: user.id, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { onboardingStep: true },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingStep: { set: Math.max(account.onboardingStep, 1) } },
  });
  redirect(draft ? `/app/projects/new?draft=${draft.id}` : "/app/projects/new");
}

export async function skipCompletedOnboardingAction() {
  const user = await requireUser("/app/onboarding");
  const project = await getPrisma().project.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!project) redirect("/app/projects/new");
  await getPrisma().user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: new Date(), onboardingStep: 8 },
  });
  redirect(`/app/projects/${project.id}`);
}
