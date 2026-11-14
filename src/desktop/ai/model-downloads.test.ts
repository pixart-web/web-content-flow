import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { findCatalogEntry } from "./model-catalog";
import {
  DigestMismatchError,
  LicenseNotAcceptedError,
  pullCatalogModel,
  type PullProgress,
} from "./model-downloads";
import { compareVersions, ollamaStatus } from "./ollama-runtime";

const entry = findCatalogEntry("gemma4-12b-qat")!;
let server: Server | undefined;
let requests: string[] = [];

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server!.close(resolve));
  }
  server = undefined;
  requests = [];
});

async function fakeOllama(options: {
  pullLines?: object[];
  installedDigest?: string | null;
  holdOpen?: boolean;
}) {
  server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    if (request.url === "/api/version") {
      response.end(JSON.stringify({ version: "0.40.16" }));
      return;
    }
    if (request.url === "/api/tags") {
      response.end(
        JSON.stringify({
          models:
            options.installedDigest === null
              ? []
              : [
                  {
                    name: entry.tag,
                    digest: options.installedDigest ?? entry.manifestDigest,
                  },
                ],
        }),
      );
      return;
    }
    if (request.url === "/api/pull") {
      response.writeHead(200, { "Content-Type": "application/x-ndjson" });
      for (const line of options.pullLines ?? [])
        response.write(`${JSON.stringify(line)}\n`);
      if (!options.holdOpen) response.end();
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

const pullLines = [
  { status: "pulling manifest" },
  { status: "pulling abc", total: 1000, completed: 250 },
  { status: "pulling abc", total: 1000, completed: 1000 },
  { status: "verifying sha256 digest" },
  { status: "success" },
];

describe("model downloads (LF-16)", () => {
  it("refuses to download before the licence is accepted, without any request", async () => {
    const baseUrl = await fakeOllama({ pullLines });
    await expect(
      pullCatalogModel({ baseUrl, entry, licenseAcceptedAt: null }),
    ).rejects.toBeInstanceOf(LicenseNotAcceptedError);
    expect(requests).toEqual([]);
  });

  it("reports progress and returns the verified install record", async () => {
    const baseUrl = await fakeOllama({ pullLines });
    const progress: PullProgress[] = [];
    const accepted = new Date("2026-11-14T12:00:00Z");
    const installed = await pullCatalogModel({
      baseUrl,
      entry,
      licenseAcceptedAt: accepted,
      onProgress: (event) => progress.push(event),
    });
    expect(progress.map((event) => event.percent)).toEqual([
      null,
      25,
      100,
      null,
      null,
    ]);
    expect(installed).toEqual({
      modelId: entry.id,
      tag: entry.tag,
      digest: entry.manifestDigest,
      license: "Apache-2.0",
      licenseAcceptedAt: accepted.toISOString(),
    });
  });

  it("rejects a model whose installed digest is not the pinned one", async () => {
    const baseUrl = await fakeOllama({
      pullLines,
      installedDigest: "f".repeat(64),
    });
    await expect(
      pullCatalogModel({ baseUrl, entry, licenseAcceptedAt: new Date() }),
    ).rejects.toBeInstanceOf(DigestMismatchError);
  });

  it("surfaces an error event from Ollama", async () => {
    const baseUrl = await fakeOllama({
      pullLines: [
        { status: "pulling manifest" },
        { error: "pull model manifest: file does not exist" },
      ],
    });
    await expect(
      pullCatalogModel({ baseUrl, entry, licenseAcceptedAt: new Date() }),
    ).rejects.toThrow(/file does not exist/);
  });

  it("can be cancelled mid-download", async () => {
    const baseUrl = await fakeOllama({
      pullLines: pullLines.slice(0, 2),
      holdOpen: true,
    });
    const controller = new AbortController();
    const pending = pullCatalogModel({
      baseUrl,
      entry,
      licenseAcceptedAt: new Date(),
      signal: controller.signal,
      onProgress: (event) => {
        if (event.percent === 25) controller.abort();
      },
    });
    await expect(pending).rejects.toThrow(/abort/i);
  });
});

describe("Ollama runtime (LF-15)", () => {
  it("compares versions", () => {
    expect(compareVersions("0.40.16", "0.40.0")).toBeGreaterThan(0);
    expect(compareVersions("0.39.9", "0.40.0")).toBeLessThan(0);
    expect(compareVersions("0.40.0", "0.40.0")).toBe(0);
  });

  it("reports running, installed or not installed", async () => {
    const baseUrl = await fakeOllama({});
    expect(await ollamaStatus({ baseUrl })).toEqual({
      state: "running",
      version: "0.40.16",
      supported: true,
    });
    const closed = "http://127.0.0.1:1";
    expect(
      await ollamaStatus({
        baseUrl: closed,
        candidates: [{ kind: "binary", path: process.execPath }],
      }),
    ).toEqual({
      state: "installed",
      install: { kind: "binary", path: process.execPath },
    });
    expect(
      await ollamaStatus({
        baseUrl: closed,
        candidates: [{ kind: "binary", path: "/nonexistent/ollama" }],
      }),
    ).toEqual({
      state: "not_installed",
      downloadUrl: "https://ollama.com/download",
    });
  });
});
