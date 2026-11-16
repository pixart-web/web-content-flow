import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseServerEnv } from "@/lib/env/server";

import {
  installationPaths,
  launchTokens,
  loadOrCreateSecrets,
  readSettings,
  runtimeEnv,
  withSystemEnv,
  writeSettings,
  type Cipher,
} from "./installation";

const roots: string[] = [];
const root = () => {
  const dir = mkdtempSync(join(tmpdir(), "wcf-shell-"));
  roots.push(dir);
  return installationPaths(dir);
};
afterAll(() =>
  roots.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

// Stand-in for safeStorage: reversible, and visibly not plain JSON.
const cipher: Cipher = {
  encrypt: async (plain) => Buffer.from(plain, "utf8").reverse(),
  decrypt: async (encrypted) =>
    Buffer.from(encrypted).reverse().toString("utf8"),
};

describe("desktop installation state (L4)", () => {
  it("creates secrets once, stores them through the cipher and reloads them", async () => {
    const paths = root();
    const first = await loadOrCreateSecrets(paths.secretsFile, cipher);
    expect(first.created).toBe(true);
    expect(readFileSync(paths.secretsFile, "utf8")).not.toContain(
      first.secrets.authSecret,
    );
    expect(statSync(paths.secretsFile).mode & 0o777).toBe(0o600);
    const second = await loadOrCreateSecrets(paths.secretsFile, cipher);
    expect(second).toEqual({ created: false, secrets: first.secrets });
  });

  it("issues different per-launch window and admin tokens", () => {
    const tokens = launchTokens();
    expect(tokens.desktopToken).not.toBe(tokens.desktopAdminToken);
    expect(launchTokens().desktopToken).not.toBe(tokens.desktopToken);
  });

  it("round-trips settings with defaults", () => {
    const paths = root();
    expect(readSettings(paths.settingsFile)).toEqual({
      format: 1,
      ollamaBaseUrl: "http://127.0.0.1:11434",
      localModel: null,
      remoteServer: null,
    });
  });

  const base = async () => ({
    port: 47831,
    databaseUrl: "postgresql://wcf:pw@127.0.0.1:54330/web_content_flow",
    secrets: (await loadOrCreateSecrets(root().secretsFile, cipher)).secrets,
    tokens: launchTokens(),
  });

  it("produces an environment the app accepts, with mock AI until a model is activated", async () => {
    const env = runtimeEnv({
      ...(await base()),
      settings: readSettings("/nonexistent"),
    });
    const parsed = parseServerEnv(env);
    expect(parsed).toMatchObject({
      APP_MODE: "local",
      AI_PROVIDER_DEFAULT: "MOCK",
      AI_REAL_GENERATION_ENABLED: false,
    });
  });

  it("switches to LOCAL generation only with a recorded, passed activation", async () => {
    const paths = root();
    writeSettings(paths.settingsFile, {
      format: 1,
      ollamaBaseUrl: "http://127.0.0.1:11434",
      remoteServer: null,
      localModel: {
        catalogId: "gemma4-12b-qat",
        tag: "gemma4:12b-it-qat",
        digest:
          "38044be4f923e5a55264ed7df4eaac2676651a905f735197c504045140c02bd3",
        structuredMode: "native_schema",
        license: "Apache-2.0",
        licenseAcceptedAt: "2026-11-15T10:00:00.000Z",
        evaluation: {
          suite: "1.4.0",
          passed: true,
          evaluatedAt: "2026-11-15T10:05:00.000Z",
          hardware: "Apple M4, 32 GB, darwin",
        },
      },
    });
    const parsed = parseServerEnv(
      runtimeEnv({
        ...(await base()),
        settings: readSettings(paths.settingsFile),
      }),
    );
    expect(parsed).toMatchObject({
      AI_PROVIDER_DEFAULT: "LOCAL",
      AI_REAL_GENERATION_ENABLED: true,
      AI_OLLAMA_MODEL: "gemma4:12b-it-qat",
      AI_OLLAMA_STRUCTURED_MODE: "native_schema",
    });
    expect(() =>
      writeSettings(paths.settingsFile, {
        ...readSettings(paths.settingsFile),
        localModel: {
          ...readSettings(paths.settingsFile).localModel!,
          evaluation: {
            ...readSettings(paths.settingsFile).localModel!.evaluation,
            passed: false as true,
          },
        },
      }),
    ).toThrow();
  });

  it("adds only the listed operating-system variables to child environments", () => {
    const merged = withSystemEnv(
      { APP_MODE: "local", PATH: "/app-path" },
      { SystemRoot: "C:\\Windows", PATH: "/usr/bin", SECRET_TOKEN: "x" },
    );
    expect(merged).toEqual({
      SystemRoot: "C:\\Windows",
      PATH: "/app-path",
      APP_MODE: "local",
    });
  });
});
