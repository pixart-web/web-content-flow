import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  replaceCaptureText,
  transformCaptureJson,
} from "../src/content/capture-fixture";
import { parseServerEnv } from "../src/lib/env/server";

async function main() {
  const env = parseServerEnv(process.env);
  if (!env.MARKETING_CAPTURE_MODE)
    throw new Error("Set MARKETING_CAPTURE_MODE=true for the capture seed.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const project = await prisma.project.findUnique({
      where: { id: "phase1-urbanstride-project" },
      include: {
        user: true,
        brief: true,
        modules: true,
        generationJobs: true,
        brandProfile: { include: { versions: true } },
        contentItems: { include: { versions: true } },
      },
    });
    if (!project)
      throw new Error(
        "Run SEED_DEMO_DATA=true pnpm prisma:seed before capture:seed.",
      );

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: project.userId },
        data: {
          email: "capture@webcontentflow.local",
          name: "Marketing Capture",
        },
      });
      await transaction.project.update({
        where: { id: project.id },
        data: {
          name: "Northstar Roasters",
          brandName: "Northstar Roasters",
          type: "Specialty coffee",
          status: "ACTIVE",
          outputLanguage: "English",
        },
      });
      if (project.brief)
        await transaction.projectBrief.update({
          where: { id: project.brief.id },
          data: { data: transformCaptureJson(project.brief.data) as object },
        });
      for (const projectModule of project.modules)
        await transaction.projectModule.update({
          where: { id: projectModule.id },
          data: {
            settings: transformCaptureJson(projectModule.settings) as object,
          },
        });
      for (const generationJob of project.generationJobs)
        await transaction.generationJob.update({
          where: { id: generationJob.id },
          data: {
            request: transformCaptureJson(generationJob.request) as object,
          },
        });
      for (const version of project.brandProfile?.versions ?? [])
        await transaction.brandProfileVersion.update({
          where: { id: version.id },
          data: {
            snapshot: transformCaptureJson(version.snapshot) as object,
            provenance: transformCaptureJson(version.provenance) as object,
          },
        });
      for (const item of project.contentItems) {
        await transaction.contentItem.update({
          where: { id: item.id },
          data: { title: replaceCaptureText(item.title) },
        });
        for (const version of item.versions)
          await transaction.contentItemVersion.update({
            where: { id: version.id },
            data: {
              snapshot: transformCaptureJson(version.snapshot) as object,
              provenance: transformCaptureJson(version.provenance) as object,
            },
          });
      }
    });
    const counts = await prisma.contentItem.groupBy({
      by: ["module"],
      where: { projectId: project.id },
      _count: true,
    });
    process.stdout.write(
      `${JSON.stringify({
        account: "capture@webcontentflow.local",
        project: "Northstar Roasters",
        fictional: true,
        modules: counts,
      })}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Capture seed failed."}\n`,
  );
  process.exitCode = 1;
});
