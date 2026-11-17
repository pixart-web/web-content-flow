import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { z } from "zod";

// L4: per-installation state of the desktop edition, under the OS user-data
// directory. Secrets are generated once and stored encrypted by the caller's
// cipher (Electron safeStorage → macOS Keychain); tests pass a plain cipher.

export type InstallationPaths = Readonly<{
  root: string;
  dataDir: string;
  backupsDir: string;
  secretsFile: string;
  settingsFile: string;
  logsDir: string;
}>;

export function installationPaths(root: string): InstallationPaths {
  return {
    root,
    dataDir: join(root, "data"),
    backupsDir: join(root, "backups"),
    secretsFile: join(root, "secrets.bin"),
    settingsFile: join(root, "settings.json"),
    logsDir: join(root, "logs"),
  };
}

export type Cipher = Readonly<{
  encrypt: (plain: string) => Promise<Buffer>;
  decrypt: (encrypted: Buffer) => Promise<string>;
}>;

export const InstallationSecretsSchema = z
  .object({
    authSecret: z.string().min(32),
    rateLimitSecret: z.string().min(32),
    databasePassword: z.string().min(24),
  })
  .strict();
export type InstallationSecrets = z.infer<typeof InstallationSecretsSchema>;

const secret = (bytes = 32) => randomBytes(bytes).toString("hex");

function writeAtomic(file: string, data: string | Buffer) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, data, { mode: 0o600 });
  renameSync(temporary, file);
}

export async function loadOrCreateSecrets(file: string, cipher: Cipher) {
  if (existsSync(file))
    return {
      created: false,
      secrets: InstallationSecretsSchema.parse(
        JSON.parse(await cipher.decrypt(readFileSync(file))),
      ),
    };
  const secrets: InstallationSecrets = {
    authSecret: secret(),
    rateLimitSecret: secret(),
    databasePassword: secret(24),
  };
  writeAtomic(file, await cipher.encrypt(JSON.stringify(secrets)));
  return { created: true, secrets };
}

// Per-launch tokens: never stored. The window gets DESKTOP_TOKEN; the admin
// token stays in the main process (owner password reset).
export function launchTokens() {
  return { desktopToken: secret(), desktopAdminToken: secret() };
}

export const LocalModelActivationSchema = z
  .object({
    catalogId: z.string(),
    tag: z.string(),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    structuredMode: z.enum(["native_schema", "json_mode", "prompted"]),
    license: z.string(),
    licenseAcceptedAt: z.iso.datetime(),
    evaluation: z
      .object({
        suite: z.string(),
        passed: z.literal(true),
        evaluatedAt: z.iso.datetime(),
        hardware: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
export type LocalModelActivation = z.infer<typeof LocalModelActivationSchema>;

// L6 on desktop: the embedding model for client knowledge (bge-m3, pinned
// digest). Independent of the text model: it only needs Ollama.
export const KnowledgeModelSchema = z
  .object({
    tag: z.literal("bge-m3"),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    license: z.literal("MIT"),
    licenseAcceptedAt: z.iso.datetime(),
  })
  .strict();
export type KnowledgeModel = z.infer<typeof KnowledgeModelSchema>;

export const InstallationSettingsSchema = z
  .object({
    format: z.literal(1),
    ollamaBaseUrl: z.url().default("http://127.0.0.1:11434"),
    localModel: LocalModelActivationSchema.nullable().default(null),
    knowledgeModel: KnowledgeModelSchema.nullable().default(null),
    // L7: when set, the app is a client of this private server (https only).
    remoteServer: z
      .object({
        url: z
          .url()
          .refine((value) => value.startsWith("https://"), "https only"),
        connectedAt: z.iso.datetime(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();
export type InstallationSettings = z.infer<typeof InstallationSettingsSchema>;

export function readSettings(file: string): InstallationSettings {
  if (!existsSync(file)) return InstallationSettingsSchema.parse({ format: 1 });
  return InstallationSettingsSchema.parse(
    JSON.parse(readFileSync(file, "utf8")),
  );
}

export function writeSettings(file: string, settings: InstallationSettings) {
  writeAtomic(
    file,
    `${JSON.stringify(InstallationSettingsSchema.parse(settings), null, 2)}\n`,
  );
}

// The environment the web server, worker and maintenance processes receive.
// LOCAL generation is switched on only by a recorded, passed activation.
export function runtimeEnv(input: {
  port: number;
  databaseUrl: string;
  secrets: InstallationSecrets;
  tokens: ReturnType<typeof launchTokens>;
  settings: InstallationSettings;
}): Record<string, string> {
  const origin = `http://127.0.0.1:${input.port}`;
  const model = input.settings.localModel;
  return {
    NODE_ENV: "production",
    APP_MODE: "local",
    APP_ENV: "local",
    DATABASE_ENVIRONMENT: "local",
    HOSTNAME: "127.0.0.1",
    PORT: String(input.port),
    NEXT_PUBLIC_APP_URL: origin,
    AUTH_URL: origin,
    DATABASE_URL: input.databaseUrl,
    AUTH_SECRET: input.secrets.authSecret,
    RATE_LIMIT_SECRET: input.secrets.rateLimitSecret,
    DESKTOP_TOKEN: input.tokens.desktopToken,
    DESKTOP_ADMIN_TOKEN: input.tokens.desktopAdminToken,
    EMAIL_PROVIDER: "MOCK",
    AI_FAKE_OPENAI_ENABLED: "false",
    AI_MAX_CONCURRENT_REQUESTS: "1",
    ...(model
      ? {
          AI_PROVIDER_DEFAULT: "LOCAL",
          AI_REAL_GENERATION_ENABLED: "true",
          AI_OLLAMA_BASE_URL: input.settings.ollamaBaseUrl,
          AI_OLLAMA_MODEL: model.tag,
          AI_OLLAMA_STRUCTURED_MODE: model.structuredMode,
          AI_OLLAMA_THINK: "false",
        }
      : { AI_PROVIDER_DEFAULT: "MOCK", AI_REAL_GENERATION_ENABLED: "false" }),
    // Client knowledge: the worker indexes documents and generation uses the
    // client's passages (B5) once the embedding model is installed.
    ...(input.settings.knowledgeModel
      ? {
          AI_OLLAMA_BASE_URL: input.settings.ollamaBaseUrl,
          KNOWLEDGE_EMBEDDING_MODEL: input.settings.knowledgeModel.tag,
        }
      : {}),
  };
}

// Operating-system variables the child processes need on top of the app
// environment: without SystemRoot, Windows cannot initialise networking
// (Winsock 10108) and the web server cannot listen. Nothing else from the
// shell's environment is passed on.
const SYSTEM_KEYS = [
  "PATH",
  "Path",
  "PATHEXT",
  "HOME",
  "USER",
  "LOGNAME",
  "USERNAME",
  "USERPROFILE",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "SystemRoot",
  "SYSTEMROOT",
  "SystemDrive",
  "windir",
  "WINDIR",
  "ComSpec",
  "APPDATA",
  "LOCALAPPDATA",
  "ProgramData",
  "ProgramFiles",
  "COMPUTERNAME",
  "XDG_RUNTIME_DIR",
  "DBUS_SESSION_BUS_ADDRESS",
  "DISPLAY",
  "WAYLAND_DISPLAY",
] as const;

export function withSystemEnv(
  env: Record<string, string>,
  source: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const system: Record<string, string> = {};
  for (const key of SYSTEM_KEYS) {
    const value = source[key];
    if (value !== undefined) system[key] = value;
  }
  return { ...system, ...env };
}
