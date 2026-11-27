import {
  app,
  dialog,
  ipcMain,
  Menu,
  MenuItem,
  shell,
  type MenuItemConstructorOptions,
} from "electron";

import { checkForUpdate, isReleasePage, updateMessage } from "./updates";

// LF-20 update notice: Settings and the Help menu ask GitHub Releases on
// demand. The only outcome is a message and, when a newer version exists, a
// button that opens its release page in the browser.

async function check(log: (message: string) => void) {
  const result = await checkForUpdate({ currentVersion: app.getVersion() });
  log(
    `Update check: ${result.state}${"latest" in result ? ` (latest ${result.latest})` : ""}${result.state === "unavailable" ? ` (${result.reason})` : ""}.`,
  );
  return result;
}

export function registerUpdatesIpc(context: {
  origin: string;
  log: (message: string) => void;
}) {
  const allowed = (event: Electron.IpcMainInvokeEvent) => {
    if (!event.senderFrame?.url.startsWith(context.origin))
      throw new Error("Not allowed.");
  };
  ipcMain.handle("wcf:app-version", (event) => {
    allowed(event);
    return app.getVersion();
  });
  ipcMain.handle("wcf:check-for-updates", (event) => {
    allowed(event);
    return check(context.log);
  });
}

export function updatesMenuItem(
  log: (message: string) => void,
): MenuItemConstructorOptions {
  return {
    label: "Check for Updates…",
    click: async () => {
      const result = await check(log);
      const available = result.state === "available";
      const { response } = await dialog.showMessageBox({
        type: "info",
        message: available ? "A new version is available" : "Updates",
        detail: `${updateMessage(result)}${available ? "\n\nDownload it from the release page and install it over this one. Your projects stay on this computer." : ""}`,
        buttons: available ? ["Open release page", "Later"] : ["OK"],
        defaultId: 0,
        cancelId: available ? 1 : 0,
      });
      if (available && response === 0 && isReleasePage(result.url))
        await shell.openExternal(result.url);
    },
  };
}

/**
 * Adds the item to the Help menu of the default application menu, creating
 * that menu when the default one has none (Electron's default has no Help).
 */
export function installUpdatesMenu(log: (message: string) => void) {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const help = menu.items.find(
    (item) => item.role?.toLowerCase() === "help",
  )?.submenu;
  if (help) {
    help.append(new MenuItem({ type: "separator" }));
    help.append(new MenuItem(updatesMenuItem(log)));
  } else {
    menu.append(
      new MenuItem({ role: "help", submenu: [updatesMenuItem(log)] }),
    );
  }
  Menu.setApplicationMenu(menu);
}
