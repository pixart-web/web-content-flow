import { app, ipcMain, Menu, shell, type BrowserWindow } from "electron";

import type { DesktopRemoteServerResult } from "./desktop-api";
import { probeRemoteServer, validateRemoteServerUrl } from "./remote-url";
import {
  readSettings,
  writeSettings,
  type InstallationPaths,
} from "./installation";

// L7: the desktop app as a client of a private Web Content Flow server
// (APP_MODE=server, compose.yaml). The window opens the server's https URL
// and the user signs in there; nothing local runs. Device tokens are left
// for the API (Kiko) where they are needed.

export function registerRemoteServerIpc(context: {
  origin: string;
  paths: InstallationPaths;
  log: (message: string) => void;
}) {
  ipcMain.handle(
    "wcf:connect-remote-server",
    async (event, input: unknown): Promise<DesktopRemoteServerResult> => {
      if (!event.senderFrame?.url.startsWith(context.origin))
        throw new Error("Not allowed.");
      const url =
        typeof input === "string" ? validateRemoteServerUrl(input) : null;
      if (!url) return { ok: false, reason: "invalid_url" };
      const probe = await probeRemoteServer(url);
      if (!probe.ok) return probe;
      writeSettings(context.paths.settingsFile, {
        ...readSettings(context.paths.settingsFile),
        remoteServer: {
          url: url.origin,
          connectedAt: new Date().toISOString(),
        },
      });
      context.log(`Connected to private server ${url.origin}; restarting.`);
      setTimeout(() => {
        app.relaunch();
        app.quit();
      }, 300);
      return { ok: true };
    },
  );
}

// Remote mode: open the server, keep navigation on it, offer a way back.
export async function startRemote(context: {
  window: BrowserWindow;
  serverUrl: string;
  paths: InstallationPaths;
  log: (message: string) => void;
}) {
  const origin = new URL(context.serverUrl).origin;
  context.window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  context.window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(origin))
      void shell.openExternal(url);
    return { action: "deny" };
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      {
        label: "Server",
        submenu: [
          { label: `Connected to ${new URL(origin).host}`, enabled: false },
          {
            label: "Use this computer's workspace",
            click: () => {
              writeSettings(context.paths.settingsFile, {
                ...readSettings(context.paths.settingsFile),
                remoteServer: null,
              });
              context.log("Disconnected from the private server; restarting.");
              app.relaunch();
              app.quit();
            },
          },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
  await context.window.loadURL(`${origin}/app`);
  context.log(`Remote mode: ${origin}`);
}
