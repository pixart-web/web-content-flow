import "server-only";

import { z } from "zod";

import { ProviderError } from "@/server/ai/ai-provider";

// Shared plumbing for HTTP runtimes (Ollama, OpenAI-compatible servers):
// timeout vs caller cancellation, HTTP status classification, and turning
// model text into zod-validated data. zod stays the authority (ADR-072).

export function jsonSchemaFor(schema: z.ZodType<unknown>) {
  return z.toJSONSchema(schema, { io: "output", unrepresentable: "any" });
}

export function schemaInstructions(schema: z.ZodType<unknown>) {
  return [
    "Return only one JSON value that validates against this JSON Schema.",
    "Do not wrap it in Markdown fences and do not add commentary.",
    JSON.stringify(jsonSchemaFor(schema)),
  ].join("\n");
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds))
    return Math.min(Math.max(Math.round(seconds * 1_000), 1_000), 300_000);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.min(Math.max(date - Date.now(), 1_000), 300_000);
}

export function providerErrorForStatus(
  status: number,
  retryAfter: string | null,
): ProviderError {
  if (status === 401 || status === 403)
    return new ProviderError(
      "AUTHENTICATION_FAILED",
      false,
      "The model runtime rejected the credentials.",
    );
  if (status === 404)
    return new ProviderError(
      "UNSUPPORTED_MODEL",
      false,
      "The model runtime does not serve the requested model.",
    );
  if (status === 413)
    return new ProviderError(
      "REQUEST_TOO_LARGE",
      false,
      "The request is too large for the model runtime.",
    );
  if (status === 429)
    return new ProviderError(
      "RATE_LIMITED",
      true,
      "The model runtime is temporarily limiting requests.",
      parseRetryAfter(retryAfter),
    );
  if (status === 503)
    return new ProviderError(
      "PROVIDER_UNAVAILABLE",
      true,
      "The model runtime is temporarily unavailable.",
      parseRetryAfter(retryAfter),
    );
  if (status >= 500)
    return new ProviderError(
      "PROVIDER_SERVER_ERROR",
      true,
      "The model runtime failed to process the request.",
    );
  return new ProviderError(
    "INVALID_PROVIDER_RESPONSE",
    false,
    "The model runtime rejected the request.",
  );
}

export async function postJson(input: {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  input.signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, input.timeoutMs);
  try {
    if (input.signal?.aborted) controller.abort();
    const response = await fetch(input.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...input.headers },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });
    if (!response.ok)
      throw providerErrorForStatus(
        response.status,
        response.headers.get("retry-after"),
      );
    try {
      return await response.json();
    } catch {
      throw new ProviderError(
        "INVALID_PROVIDER_RESPONSE",
        false,
        "The model runtime returned an unreadable response.",
      );
    }
  } catch (error: unknown) {
    if (error instanceof ProviderError) throw error;
    if (timedOut)
      throw new ProviderError("TIMEOUT", true, "The model runtime timed out.");
    if (input.signal?.aborted)
      throw new ProviderError("CANCELLED", false, "Generation was cancelled.");
    throw new ProviderError(
      "TRANSIENT_NETWORK",
      true,
      "The model runtime could not be reached.",
    );
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", abort);
  }
}

function stripFences(text: string) {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  return fenced ? fenced[1]! : text.trim();
}

export function parseStructuredContent<TOutput>(
  content: unknown,
  schema: z.ZodType<TOutput>,
): TOutput {
  if (typeof content !== "string" || content.trim() === "")
    throw new ProviderError(
      "INVALID_PROVIDER_RESPONSE",
      false,
      "The model runtime returned no content.",
    );
  let value: unknown;
  try {
    value = JSON.parse(stripFences(content));
  } catch {
    throw new ProviderError(
      "SCHEMA_VALIDATION_FAILED",
      false,
      "The generated content was not valid JSON.",
      undefined,
      undefined,
      content.slice(0, 20_000),
      ["Output is not valid JSON."],
    );
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ProviderError(
      "SCHEMA_VALIDATION_FAILED",
      false,
      "The generated content did not match the required structure.",
      undefined,
      undefined,
      value,
      parsed.error.issues
        .slice(0, 20)
        .map(
          (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        ),
    );
  return parsed.data;
}
