import { createHash, timingSafeEqual } from "node:crypto";

// L1 (ADR L-1): request policy for APP_MODE=local, the desktop edition.
// - Every request must carry the per-launch desktop token, so no other local
//   process or web page can reach the app on 127.0.0.1 (liveness excepted).
// - Marketing pages belong to the public site, not the desktop app: they
//   redirect to /app. Nothing is deleted; server mode is unchanged.

export const DESKTOP_TOKEN_HEADER = "x-wcf-desktop-token";

const LOCAL_MODE_PATHS = [
  "/app",
  "/api",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/health",
  "/legal",
  "/privacy",
  "/terms",
  "/cookies",
  "/help",
] as const;

function underPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isLocalModePath(pathname: string) {
  return LOCAL_MODE_PATHS.some((prefix) => underPath(pathname, prefix));
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function desktopTokenMatches(expected: string, provided: string | null) {
  if (!provided) return false;
  // Hashing first gives equal-length buffers, so the comparison is constant
  // time regardless of the provided length.
  return timingSafeEqual(digest(expected), digest(provided));
}

export type LocalModeDecision =
  | { action: "next" }
  | { action: "reject" }
  | { action: "redirect"; location: string };

export function localModeDecision(input: {
  pathname: string;
  expectedToken: string | undefined;
  providedToken: string | null;
}): LocalModeDecision {
  if (input.pathname === "/health/live") return { action: "next" };
  if (
    input.expectedToken !== undefined &&
    !desktopTokenMatches(input.expectedToken, input.providedToken)
  )
    return { action: "reject" };
  if (!isLocalModePath(input.pathname))
    return { action: "redirect", location: "/app" };
  return { action: "next" };
}
