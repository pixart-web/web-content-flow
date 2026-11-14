import "server-only";

import type { ServerEnv } from "@/lib/env/server";

// C-03 health: "configured" (runtimeAvailability) is not "reachable". This
// probe asks a local or self-hosted runtime which models it serves, so a
// missing `ollama pull` or a stopped server shows up before a job or an
// evaluation run spends minutes timing out. Read-only, no prompt content.

export type RuntimeHealth = Readonly<{
  runtimeKey: string;
  status: "ok" | "model_missing" | "unreachable" | "not_configured";
  model: string | null;
  availableModels: readonly string[];
  latencyMs: number | null;
  detail?: string;
}>;

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

// Ollama treats a name without a tag as ":latest".
export function normalizeOllamaModel(name: string) {
  return name.includes(":") ? name : `${name}:latest`;
}

async function getJson(
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function describe(error: unknown) {
  if (error instanceof Error)
    return error.name === "TimeoutError" ? "timeout" : error.message;
  return "unknown error";
}

export async function probeRuntime(
  input: Readonly<{
    runtimeKey: "ollama" | "openai-compatible";
    baseUrl: string | undefined;
    model: string | undefined;
    apiKey?: string | undefined;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }>,
): Promise<RuntimeHealth> {
  const { runtimeKey, baseUrl, model } = input;
  if (!baseUrl || !model)
    return {
      runtimeKey,
      status: "not_configured",
      model: model ?? null,
      availableModels: [],
      latencyMs: null,
    };
  const startedAt = performance.now();
  try {
    let availableModels: string[];
    if (runtimeKey === "ollama") {
      const body = (await getJson(
        new URL("api/tags", withSlash(baseUrl)).href,
        input.timeoutMs ?? 3_000,
        {},
        input.fetchImpl,
      )) as { models?: { name?: unknown }[] };
      availableModels = (body.models ?? [])
        .map((entry) => entry.name)
        .filter((name): name is string => typeof name === "string");
    } else {
      const body = (await getJson(
        new URL("v1/models", withSlash(baseUrl)).href,
        input.timeoutMs ?? 3_000,
        input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
        input.fetchImpl,
      )) as { data?: { id?: unknown }[] };
      availableModels = (body.data ?? [])
        .map((entry) => entry.id)
        .filter((id): id is string => typeof id === "string");
    }
    const latencyMs = Math.round(performance.now() - startedAt);
    const served =
      runtimeKey === "ollama"
        ? availableModels.map(normalizeOllamaModel)
        : availableModels;
    const wanted =
      runtimeKey === "ollama" ? normalizeOllamaModel(model) : model;
    return {
      runtimeKey,
      status: served.includes(wanted) ? "ok" : "model_missing",
      model,
      availableModels,
      latencyMs,
    };
  } catch (error: unknown) {
    return {
      runtimeKey,
      status: "unreachable",
      model,
      availableModels: [],
      latencyMs: null,
      detail: describe(error),
    };
  }
}

export function probeConfiguredRuntimes(
  env: ServerEnv,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
) {
  return Promise.all([
    probeRuntime({
      runtimeKey: "ollama",
      baseUrl: env.AI_OLLAMA_BASE_URL,
      model: env.AI_OLLAMA_MODEL,
      ...options,
    }),
    probeRuntime({
      runtimeKey: "openai-compatible",
      baseUrl: env.AI_OPENAI_COMPATIBLE_BASE_URL,
      model: env.AI_OPENAI_COMPATIBLE_MODEL,
      apiKey: env.AI_OPENAI_COMPATIBLE_API_KEY,
      ...options,
    }),
  ]);
}
