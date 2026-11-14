import type { CatalogEntry } from "./model-catalog";

// L3 (LF-16): downloads a catalog model through Ollama's /api/pull with
// progress and cancellation (validated in L0: a cancelled pull resumes), then
// checks that the installed manifest digest is the one the catalog pins.

export class LicenseNotAcceptedError extends Error {
  constructor(readonly modelId: string) {
    super(`The licence for ${modelId} has not been accepted.`);
    this.name = "LicenseNotAcceptedError";
  }
}

export class DigestMismatchError extends Error {
  constructor(
    readonly tag: string,
    readonly expected: string,
    readonly actual: string | null,
  ) {
    super(
      `${tag} is installed with digest ${actual ?? "none"}, expected ${expected}.`,
    );
    this.name = "DigestMismatchError";
  }
}

export type PullProgress = Readonly<{
  status: string;
  completed: number | null;
  total: number | null;
  percent: number | null;
}>;

export type InstalledModel = Readonly<{
  modelId: string;
  tag: string;
  digest: string;
  license: CatalogEntry["license"]["spdx"];
  licenseAcceptedAt: string;
}>;

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);
const normalize = (name: string) =>
  name.includes(":") ? name : `${name}:latest`;

export async function installedDigest(
  baseUrl: string,
  tag: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetchImpl(new URL("api/tags", withSlash(baseUrl)));
  if (!response.ok)
    throw new Error(`Ollama /api/tags: HTTP ${response.status}`);
  const body = (await response.json()) as {
    models?: { name?: string; digest?: string }[];
  };
  const found = (body.models ?? []).find(
    (model) => model.name && normalize(model.name) === normalize(tag),
  );
  return found?.digest ?? null;
}

export async function pullCatalogModel(input: {
  baseUrl: string;
  entry: CatalogEntry;
  licenseAcceptedAt: Date | null;
  onProgress?: (progress: PullProgress) => void;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<InstalledModel> {
  // The licence is accepted before any byte is downloaded.
  if (!input.licenseAcceptedAt)
    throw new LicenseNotAcceptedError(input.entry.id);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    new URL("api/pull", withSlash(input.baseUrl)),
    {
      method: "POST",
      body: JSON.stringify({ model: input.entry.tag, stream: true }),
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
  if (!response.ok || !response.body)
    throw new Error(`Ollama /api/pull: HTTP ${response.status}`);

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line) as {
        status?: string;
        error?: string;
        completed?: number;
        total?: number;
      };
      if (event.error) throw new Error(`Ollama pull failed: ${event.error}`);
      const total = event.total ?? null;
      const completed = event.completed ?? null;
      input.onProgress?.({
        status: event.status ?? "",
        completed,
        total,
        percent:
          total && completed !== null
            ? Math.min(100, Math.floor((completed / total) * 100))
            : null,
      });
    }
  }

  const digest = await installedDigest(
    input.baseUrl,
    input.entry.tag,
    fetchImpl,
  );
  if (digest !== input.entry.manifestDigest)
    throw new DigestMismatchError(
      input.entry.tag,
      input.entry.manifestDigest,
      digest,
    );
  return {
    modelId: input.entry.id,
    tag: input.entry.tag,
    digest,
    license: input.entry.license.spdx,
    licenseAcceptedAt: input.licenseAcceptedAt.toISOString(),
  };
}
