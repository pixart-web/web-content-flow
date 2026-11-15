import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  app,
  ipcMain,
  shell,
  utilityProcess,
  type IpcMainInvokeEvent,
} from "electron";

import {
  detectHardware,
  modelsForHardware,
  profileFor,
} from "@/desktop/ai/hardware";
import { findCatalogEntry, MODEL_CATALOG } from "@/desktop/ai/model-catalog";
import {
  installedDigest,
  pullCatalogModel,
} from "@/desktop/ai/model-downloads";
import { ollamaStatus, startOllama } from "@/desktop/ai/ollama-runtime";

import {
  ACTIVATION_CASES,
  activationDecision,
  activationRecord,
  type EvaluationReportLike,
} from "./ai-setup";
import type { DesktopAiOverview, DesktopEvaluationResult } from "./desktop-api";
import {
  readSettings,
  writeSettings,
  type InstallationPaths,
} from "./installation";

// L4b: main-process side of the local AI assistant. Every handler checks that
// the call comes from the local app origin; nothing else in the window can
// reach these channels.

const GB = 1024 ** 3;

export function registerAiIpc(context: {
  origin: string;
  here: string;
  paths: InstallationPaths;
  env: () => Record<string, string>;
  log: (message: string) => void;
}) {
  const settings = () => readSettings(context.paths.settingsFile);
  const ollamaUrl = () => settings().ollamaBaseUrl;
  const downloads = new Map<string, AbortController>();
  // Licence acceptance is kept per model until the activation is written.
  const acceptedAt = new Map<string, string>();

  const guard = (event: IpcMainInvokeEvent) => {
    if (!event.senderFrame?.url.startsWith(context.origin))
      throw new Error("Not allowed.");
  };
  const handle = <A extends unknown[], R>(
    channel: string,
    run: (event: IpcMainInvokeEvent, ...args: A) => Promise<R>,
  ) =>
    ipcMain.handle(channel, (event, ...args) => {
      guard(event);
      return run(event, ...(args as A));
    });

  async function overview(): Promise<DesktopAiOverview> {
    const hardware = await detectHardware(context.paths.root);
    const status = await ollamaStatus({ baseUrl: ollamaUrl() });
    const running = status.state === "running";
    const offers = await Promise.all(
      modelsForHardware(MODEL_CATALOG, hardware).map(
        async ({ entry, fitsOnDisk, recommended }) => {
          const digest = running
            ? await installedDigest(ollamaUrl(), entry.tag).catch(() => null)
            : null;
          return {
            id: entry.id,
            displayName: entry.displayName,
            tag: entry.tag,
            sizeBytes: entry.sizeBytes,
            license: entry.license.spdx,
            licenseUrl: entry.license.url,
            evaluationStatus: entry.evaluation.status,
            evaluationSummary: entry.evaluation.summary,
            recommended,
            fitsOnDisk,
            installed: digest !== null,
            digestMatches: digest === entry.manifestDigest,
          };
        },
      ),
    );
    const active = settings().localModel;
    return {
      hardware: {
        cpu: hardware.cpu,
        memoryGb: Math.round(hardware.memoryBytes / GB),
        freeDiskGb:
          hardware.freeDiskBytes === null
            ? null
            : Math.floor(hardware.freeDiskBytes / GB),
        profile: profileFor(hardware),
      },
      ollama:
        status.state === "running"
          ? status
          : status.state === "installed"
            ? { state: "installed" }
            : status,
      offers,
      active: active
        ? {
            catalogId: active.catalogId,
            tag: active.tag,
            evaluatedAt: active.evaluation.evaluatedAt,
          }
        : null,
    };
  }

  const entryOf = (id: string) => {
    const entry = findCatalogEntry(id);
    if (!entry || entry.evaluation.status === "rejected")
      throw new Error("Unknown model.");
    return entry;
  };

  handle("wcf:ai-overview", () => overview());

  handle("wcf:ai-start-ollama", async () => {
    const status = await ollamaStatus({ baseUrl: ollamaUrl() });
    if (status.state === "installed")
      await startOllama({ baseUrl: ollamaUrl(), install: status.install });
    return overview();
  });

  handle(
    "wcf:ai-download",
    async (event, id: string, licenseAccepted: boolean) => {
      const entry = entryOf(id);
      if (licenseAccepted !== true)
        throw new Error("The licence must be accepted.");
      const accepted = new Date();
      acceptedAt.set(id, accepted.toISOString());
      const controller = new AbortController();
      downloads.set(id, controller);
      try {
        await pullCatalogModel({
          baseUrl: ollamaUrl(),
          entry,
          licenseAcceptedAt: accepted,
          signal: controller.signal,
          onProgress: (progress) =>
            event.sender.send("wcf:ai-download-progress", {
              id,
              status: progress.status,
              percent: progress.percent,
            }),
        });
        context.log(`Model ${entry.tag} downloaded and verified.`);
      } finally {
        downloads.delete(id);
      }
    },
  );

  handle("wcf:ai-cancel-download", async (_event, id: string) => {
    downloads.get(id)?.abort();
  });

  // Quick on-device evaluation with the bundled suite (evaluate.mjs).
  const reports = new Map<string, EvaluationReportLike>();
  handle(
    "wcf:ai-evaluate",
    async (_event, id: string): Promise<DesktopEvaluationResult> => {
      const entry = entryOf(id);
      const out = mkdtempSync(join(tmpdir(), "wcf-eval-"));
      const started = Date.now();
      try {
        await new Promise<void>((resolve) => {
          const child = utilityProcess.fork(
            join(context.here, "evaluate.mjs"),
            [
              "--runtime",
              "ollama",
              "--samples",
              "1",
              "--cases",
              ACTIVATION_CASES.join(","),
              "--out",
              out,
            ],
            {
              env: {
                ...context.env(),
                AI_OLLAMA_BASE_URL: ollamaUrl(),
                AI_OLLAMA_MODEL: entry.tag,
                AI_OLLAMA_STRUCTURED_MODE: entry.structuredMode,
                AI_OLLAMA_THINK: "false",
              },
              serviceName: "wcf-evaluate",
              stdio: "pipe",
            },
          );
          child.stderr?.on("data", (chunk: Buffer) =>
            context.log(`[evaluate] ${chunk.toString().trim()}`),
          );
          // Never wait forever: four cases take 3 to 5 minutes on an M4.
          const limit = setTimeout(() => child.kill(), 20 * 60 * 1000);
          child.once("exit", () => {
            clearTimeout(limit);
            resolve();
          });
        });
        const file = readdirSync(out).find((name) => name.endsWith(".json"));
        if (!file) throw new Error("The evaluation produced no report.");
        const report = JSON.parse(
          readFileSync(join(out, file), "utf8"),
        ) as EvaluationReportLike;
        reports.set(id, report);
        const decision = activationDecision(report);
        context.log(
          `Evaluation of ${entry.tag}: ${decision.approved ? "approved" : decision.reasons.join("; ")}`,
        );
        return { id, ...decision, durationMs: Date.now() - started };
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
  );

  handle("wcf:ai-activate", async (_event, id: string) => {
    const entry = entryOf(id);
    const report = reports.get(id);
    const licence = acceptedAt.get(id);
    if (!report || !licence)
      throw new Error("Download and evaluate the model first.");
    const digest = await installedDigest(ollamaUrl(), entry.tag);
    const record = activationRecord({
      entry,
      digest: digest ?? "",
      licenseAcceptedAt: licence,
      report,
    });
    writeSettings(context.paths.settingsFile, {
      ...settings(),
      localModel: record,
    });
    context.log(`Activated ${entry.tag}; restarting.`);
    app.relaunch();
    app.quit();
  });

  handle("wcf:ai-deactivate", async () => {
    writeSettings(context.paths.settingsFile, {
      ...settings(),
      localModel: null,
    });
    context.log("Local model deactivated; restarting.");
    app.relaunch();
    app.quit();
  });

  handle("wcf:open-external", async (_event, url: string) => {
    // Only the documented destinations (Ollama download, licence texts).
    if (/^https:\/\/(ollama\.com|www\.apache\.org|opensource\.org)\//.test(url))
      await shell.openExternal(url);
  });
}
