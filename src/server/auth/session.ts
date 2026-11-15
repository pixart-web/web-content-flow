import "server-only";

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { getPrisma } from "@/server/db/prisma";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

// Secure cookies follow the app URL's protocol, exactly as Auth.js decides
// which cookie to read (useSecureCookies). Using NODE_ENV instead made the
// desktop edition (production build on http://127.0.0.1) write a cookie that
// Auth.js never read, so sign-in did not stick.
export function sessionCookiePolicy(authUrl = process.env.AUTH_URL) {
  let secure = false;
  try {
    secure = new URL(authUrl ?? "").protocol === "https:";
  } catch {}
  return { name: secure ? SECURE_SESSION_COOKIE : SESSION_COOKIE, secure };
}

export async function createDatabaseSession(userId: string): Promise<void> {
  const sessionToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await getPrisma().session.create({
    data: { sessionToken, userId, expires },
  });

  const cookieStore = await cookies();
  const policy = sessionCookiePolicy();
  cookieStore.set(policy.name, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: policy.secure,
    path: "/",
    expires,
  });
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(SECURE_SESSION_COOKIE)?.value ??
    cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await getPrisma().session.deleteMany({ where: { sessionToken } });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SECURE_SESSION_COOKIE);
}
