"use server";

import { randomUUID } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/server/auth/require-user";
import { deleteCurrentSession } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { getEmailProvider } from "@/server/email/providers";
import { passwordChangedTemplate } from "@/server/email/templates";
import { getServerEnv } from "@/lib/env/server";

export type SettingsState = { message?: string; success?: boolean };

const passwordOptions: Options = {
  algorithm: 2,
  version: 1,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export async function updateNameAction(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser("/app/settings/account");
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success)
    return { message: "Enter a display name of 2–80 characters." };
  await getPrisma().user.update({
    where: { id: user.id },
    data: { name: name.data },
  });
  return { success: true, message: "Display name updated." };
}

export async function changePasswordAction(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser("/app/settings/security");
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(12).max(128),
    })
    .safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });
  if (!parsed.success)
    return { message: "Check the current and new password fields." };
  const record = await getPrisma().user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, email: true },
  });
  const valid =
    record?.passwordHash &&
    (await verify(record.passwordHash, parsed.data.currentPassword).catch(
      () => false,
    ));
  if (!record || !valid)
    return { message: "The current password is incorrect." };
  const passwordHash = await hash(parsed.data.newPassword, passwordOptions);
  await getPrisma().$transaction([
    getPrisma().user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    getPrisma().session.deleteMany({ where: { userId: user.id } }),
  ]);
  const env = getServerEnv();
  const template = passwordChangedTemplate();
  await getEmailProvider().send({
    to: record.email,
    from: env.EMAIL_FROM,
    subject: template.subject,
    text: template.text,
    html: template.html,
    templateKey: template.key,
    correlationId: randomUUID(),
  });
  await deleteCurrentSession();
  redirect("/sign-in?passwordReset=1");
}
