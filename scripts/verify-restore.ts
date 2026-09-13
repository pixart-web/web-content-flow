import "dotenv/config";

import { createPrismaClient } from "../src/server/db/create-prisma-client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);

async function main() {
  const [
    users,
    projects,
    briefs,
    profiles,
    items,
    versions,
    jobs,
    usage,
    reservations,
    exports,
    invalidPointers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.projectBrief.count(),
    prisma.brandProfileVersion.count(),
    prisma.contentItem.count(),
    prisma.contentItemVersion.count(),
    prisma.generationJob.count(),
    prisma.generationUsage.count(),
    prisma.usageReservation.count(),
    prisma.contentExport.count(),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "ContentItem" item
      JOIN "ContentItemVersion" version ON version.id = item."currentVersionId"
      WHERE version."contentItemId" <> item.id
    `,
  ]);
  const result = {
    users,
    projects,
    briefs,
    brandProfileVersions: profiles,
    contentItems: items,
    contentItemVersions: versions,
    generationJobs: jobs,
    usage,
    reservations,
    exports,
    invalidCurrentPointers: Number(invalidPointers[0]?.count ?? 0),
  };
  console.warn(JSON.stringify({ event: "restore.verification", ...result }));
  if (result.invalidCurrentPointers > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
