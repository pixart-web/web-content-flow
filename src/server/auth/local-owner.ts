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

// Owner password reset for the desktop edition. Only the desktop shell calls
// it, after macOS authentication (Touch ID or the account password); there is
// no email in local mode. All sessions end, so other windows must sign in.
export async function resetLocalOwnerPassword(
  prisma: PrismaClient,
  passwordHash: string,
) {
  return prisma.$transaction(async (tx) => {
    const owners = await tx.user.findMany({ select: { id: true }, take: 2 });
    if (owners.length !== 1) return false;
    const ownerId = owners[0]!.id;
    await tx.user.update({ where: { id: ownerId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: ownerId } });
    return true;
  });
}
