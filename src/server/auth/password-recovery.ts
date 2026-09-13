import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hash } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";

import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/server/db/prisma";
import { sendTransactionalEmailSafely } from "@/server/email/providers";
import {
  passwordChangedTemplate,
  passwordResetTemplate,
} from "@/server/email/templates";

const RESET_MINUTES = 30;
const passwordOptions: Options = {
  algorithm: 2,
  version: 1,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  });
  if (!user) return { accepted: true as const };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60_000);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const env = getServerEnv();
  const resetUrl = new URL("/reset-password", env.NEXT_PUBLIC_APP_URL);
  resetUrl.searchParams.set("token", token);
  const template = passwordResetTemplate({
    resetUrl: resetUrl.toString(),
    expiresMinutes: RESET_MINUTES,
  });
  await sendTransactionalEmailSafely({
    to: user.email,
    from: env.EMAIL_FROM,
    subject: template.subject,
    text: template.text,
    html: template.html,
    templateKey: template.key,
    correlationId: randomUUID(),
  });
  return {
    accepted: true as const,
    ...(process.env.NODE_ENV === "test" ? { testToken: token } : {}),
  };
}

export async function resetPassword(input: {
  token: string;
  password: string;
}) {
  const prisma = getPrisma();
  const tokenHash = hashResetToken(input.token);
  const passwordHash = await hash(input.password, passwordOptions);
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) return null;
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return null;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    return record.user;
  });
  if (!result) return { ok: false as const };

  const env = getServerEnv();
  const template = passwordChangedTemplate();
  await sendTransactionalEmailSafely({
    to: result.email,
    from: env.EMAIL_FROM,
    subject: template.subject,
    text: template.text,
    html: template.html,
    templateKey: template.key,
    correlationId: randomUUID(),
  });
  return { ok: true as const };
}
