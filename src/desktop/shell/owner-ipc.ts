import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { app, ipcMain } from "electron";

import type { DesktopPasswordResetResult } from "./desktop-api";

// L4c (decision L-8): owner password reset in the desktop edition. macOS
// confirms the logged-in user (Touch ID or account password, system dialog,
// via bin/wcf-os-auth); only then does the shell call the local admin
// endpoint with the admin token, which the window never holds.

export function registerOwnerIpc(context: {
  origin: string;
  here: string;
  tokens: { desktopToken: string; desktopAdminToken: string };
  log: (message: string) => void;
}) {
  const helper = join(context.here, "bin", "wcf-os-auth");

  const authenticate = () =>
    new Promise<"authenticated" | "denied" | "unavailable">((resolve) => {
      // Development-only switch to exercise the rest of the flow in tests.
      if (!app.isPackaged && process.env.WCF_DESKTOP_FAKE_OS_AUTH === "approve")
        return resolve("authenticated");
      if (process.platform !== "darwin" || !existsSync(helper))
        return resolve("unavailable");
      execFile(helper, ["reset the Web Content Flow password"], (error) => {
        const code = (error as { code?: number } | null)?.code ?? 0;
        resolve(
          code === 0 ? "authenticated" : code === 3 ? "unavailable" : "denied",
        );
      });
    });

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
      context.log(`Owner password reset: macOS authentication ${outcome}.`);
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
