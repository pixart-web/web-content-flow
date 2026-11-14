import { z } from "zod";

import { desktopTokenMatches } from "./app-mode";

// Request policy for local administration endpoints (desktop edition only).
// The admin token lives in the shell's main process; the window only ever
// has DESKTOP_TOKEN, so page scripts cannot call these endpoints.

export const DESKTOP_ADMIN_TOKEN_HEADER = "x-wcf-desktop-admin-token";

export const ownerPasswordSchema = z.object({
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters."),
});

export type LocalAdminCheck = { ok: true } | { ok: false; status: 403 | 404 };

export function checkLocalAdminRequest(input: {
  appMode: "server" | "local";
  expectedAdminToken: string | undefined;
  providedAdminToken: string | null;
}): LocalAdminCheck {
  // Server mode does not expose local administration at all.
  if (input.appMode !== "local") return { ok: false, status: 404 };
  if (
    !input.expectedAdminToken ||
    !desktopTokenMatches(input.expectedAdminToken, input.providedAdminToken)
  )
    return { ok: false, status: 403 };
  return { ok: true };
}
