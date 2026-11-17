import { join } from "node:path";

import { app, ipcMain } from "electron";

import type { DesktopPasswordResetResult } from "./desktop-api";
import { authenticateOwner, type OsAuthOutcome } from "./os-auth";

// L4c (decision L-8): owner password reset in the desktop edition. The
// operating system confirms the logged-in user in its own dialog (os-auth.ts:
// macOS, Windows Hello or polkit); only then does the shell call the local
// admin endpoint with the admin token, which the window never holds.

export function registerOwnerIpc(context: {
  origin: string;
  here: string;
  tokens: { desktopToken: string; desktopAdminToken: string };
  log: (message: string) => void;
}) {
  const helper = join(context.here, "bin", "wcf-os-auth");

  const authenticate = (): Promise<OsAuthOutcome> => {
    // Development-only switch to exercise the rest of the flow in tests.
    if (!app.isPackaged && process.env.WCF_DESKTOP_FAKE_OS_AUTH === "approve")
      return Promise.resolve("authenticated");
    return authenticateOwner({
      platform: process.platform,
      reason: "reset the Web Content Flow password",
      macHelper: helper,
    });
  };

  ipcMain.handle(
    "wcf:reset-owner-password",
    async (event, password: unknown): Promise<DesktopPasswordResetResult> => {
      if (!event.senderFrame?.url.startsWith(context.origin))
        throw new Error("Not allowed.");
      if (
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
      )
        return { ok: false, reason: "invalid_password" };
      const outcome = await authenticate();
      context.log(
        `Owner password reset: ${process.platform} authentication ${outcome}.`,
      );
      if (outcome !== "authenticated") return { ok: false, reason: outcome };
      const response = await fetch(
        `${context.origin}/api/local/owner-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wcf-desktop-token": context.tokens.desktopToken,
            "x-wcf-desktop-admin-token": context.tokens.desktopAdminToken,
          },
          body: JSON.stringify({ password }),
        },
      );
      context.log(`Owner password reset: endpoint ${response.status}.`);
      if (response.ok) return { ok: true };
      return {
        ok: false,
        reason: response.status === 409 ? "no_owner" : "failed",
      };
    },
  );
}
