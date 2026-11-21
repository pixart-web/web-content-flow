"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/server/auth/require-user";

import { THEME_COOKIE, parseTheme } from "./theme";

export async function setThemeAction(formData: FormData) {
  await requireUser();
  const theme = parseTheme(String(formData.get("theme") ?? ""));
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
}
