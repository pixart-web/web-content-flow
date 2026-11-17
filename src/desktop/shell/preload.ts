import { contextBridge, ipcRenderer } from "electron";

import type { DesktopDownloadProgress, WcfDesktopApi } from "./desktop-api";

// L4b: the only bridge between the app pages and the desktop shell. It exposes
// fixed calls, never ipcRenderer itself.

const api: WcfDesktopApi = {
  platform:
    process.platform === "darwin" ||
    process.platform === "win32" ||
    process.platform === "linux"
      ? process.platform
      : "other",
  connectRemoteServer: (url) =>
    ipcRenderer.invoke("wcf:connect-remote-server", url),
  resetOwnerPassword: (password) =>
    ipcRenderer.invoke("wcf:reset-owner-password", password),
  aiOverview: () => ipcRenderer.invoke("wcf:ai-overview"),
  startOllama: () => ipcRenderer.invoke("wcf:ai-start-ollama"),
  downloadModel: (id, licenseAccepted) =>
    ipcRenderer.invoke("wcf:ai-download", id, licenseAccepted),
  cancelDownload: (id) => ipcRenderer.invoke("wcf:ai-cancel-download", id),
  downloadKnowledgeModel: (licenseAccepted) =>
    ipcRenderer.invoke("wcf:ai-download-knowledge-model", licenseAccepted),
  removeKnowledgeModel: () =>
    ipcRenderer.invoke("wcf:ai-remove-knowledge-model"),
  onDownloadProgress: (listener) => {
    const handler = (_event: unknown, progress: DesktopDownloadProgress) =>
      listener(progress);
    ipcRenderer.on("wcf:ai-download-progress", handler);
    return () =>
      ipcRenderer.removeListener("wcf:ai-download-progress", handler);
  },
  evaluateModel: (id) => ipcRenderer.invoke("wcf:ai-evaluate", id),
  activateModel: (id) => ipcRenderer.invoke("wcf:ai-activate", id),
  deactivateModel: () => ipcRenderer.invoke("wcf:ai-deactivate"),
  openExternal: (url) => ipcRenderer.invoke("wcf:open-external", url),
};

contextBridge.exposeInMainWorld("wcfDesktop", api);
