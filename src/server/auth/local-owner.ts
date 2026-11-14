import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

// LF-06 (L1): in APP_MODE=local the desktop installation has one owner,
// created on first run. Sign-up is open only while no account exists; the
// check and the insert run under one advisory lock so two concurrent first-run
// submissions cannot both create an owner.

const LOCAL_OWNER_LOCK = "wcf:local-owner";

export async function localOwnerExists(prisma: PrismaClient) {
  return (await prisma.user.count()) > 0;
}

export async function createLocalOwner(
  prisma: PrismaClient,
  input: { email: string; name: string; passwordHash: string },
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCAL_OWNER_LOCK}))`;
    if ((await tx.user.count()) > 0) return null;
    return tx.user.create({
      data: input,
      select: { id: true, name: true, email: true },
    });
  });
}
