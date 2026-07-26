"use server";

import { hash, verify } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrisma } from "@/server/db/prisma";
import {
  createDatabaseSession,
  deleteCurrentSession,
} from "@/server/auth/session";
import { createUserRepository } from "@/server/repositories/user-repository";

export type AuthFormState = {
  message?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters."),
  returnTo: z.string().optional(),
});

const registrationSchema = credentialsSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Use no more than 80 characters."),
});

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith("/app") && !value.startsWith("//") ? value : "/app";
}

const passwordOptions: Options = {
  algorithm: 2,
  version: 1,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const users = createUserRepository(getPrisma());
  const existing = await users.findByEmail(parsed.data.email);
  if (existing) {
    return {
      message:
        "An account could not be created with those details. Try signing in.",
    };
  }

  try {
    const passwordHash = await hash(parsed.data.password, passwordOptions);
    const user = await users.createWithPassword({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });
    await createDatabaseSession(user.id);
  } catch {
    return {
      message: "Your account could not be created right now. Please try again.",
    };
  }

  redirect(safeReturnTo(parsed.data.returnTo));
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await createUserRepository(getPrisma()).findByEmail(
    parsed.data.email,
  );
  const valid =
    user?.passwordHash &&
    (await verify(user.passwordHash, parsed.data.password).catch(() => false));

  if (!user || !valid) {
    return { message: "Email or password is incorrect." };
  }

  await createDatabaseSession(user.id);
  redirect(safeReturnTo(parsed.data.returnTo));
}

export async function signOutAction(): Promise<void> {
  await deleteCurrentSession();
  redirect("/sign-in?signedOut=1");
}
