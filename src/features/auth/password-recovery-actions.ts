"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  requestPasswordReset,
  resetPassword,
} from "@/server/auth/password-recovery";
import {
  enforceRateLimit,
  requestSubject,
  RateLimitError,
} from "@/server/security/rate-limit";

export type RecoveryState = {
  message?: string;
  success?: boolean;
  fieldErrors?: { email?: string[]; password?: string[]; token?: string[] };
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.");

export async function forgotPasswordAction(
  _state: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success)
    return { fieldErrors: { email: [parsed.error.issues[0]!.message] } };
  try {
    await enforceRateLimit({
      action: "forgot-password",
      subjectHash: await requestSubject(parsed.data),
      limit: 5,
      windowSeconds: 15 * 60,
    });
    await requestPasswordReset(parsed.data);
  } catch (error: unknown) {
    if (!(error instanceof RateLimitError)) {
      // The response remains neutral even when delivery is unavailable.
    }
  }
  return {
    success: true,
    message:
      "If an account exists for that email address, password-reset instructions have been sent.",
  };
}

export async function resetPasswordAction(
  _state: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const token = z.string().min(20).max(256).safeParse(formData.get("token"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!token.success || !password.success)
    return {
      fieldErrors: {
        ...(!token.success ? { token: ["This reset link is invalid."] } : {}),
        ...(!password.success
          ? { password: [password.error.issues[0]!.message] }
          : {}),
      },
    };
  try {
    await enforceRateLimit({
      action: "reset-password",
      subjectHash: await requestSubject(),
      limit: 10,
      windowSeconds: 15 * 60,
    });
  } catch {
    return { message: "Please wait before trying another password reset." };
  }
  const result = await resetPassword({
    token: token.data,
    password: password.data,
  });
  if (!result.ok)
    return {
      message:
        "This reset link is invalid or expired. Request a new password reset.",
    };
  redirect("/sign-in?passwordReset=1");
}
