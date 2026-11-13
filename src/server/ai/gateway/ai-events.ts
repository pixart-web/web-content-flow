import type {
  GenerationModelTier,
  GenerationPurpose,
  ProviderErrorCode,
} from "@/server/ai/ai-provider";

import type { RouteExclusion } from "./router";

// B-08 / ADR-075: structured AI events for operators. The types admit only
// identifiers, routing facts, timings and token counts — never prompt text,
// brand context or generated output. Prompt inspection stays behind
// AI_PROMPT_DEBUG_ENABLED (local/test only).

type RouteFacts = {
  jobId: string;
  taskKey: string;
  tier: GenerationModelTier;
};

type RequestFacts = {
  jobId: string;
  runtimeKey: string;
  modelRef: string;
  purpose: GenerationPurpose;
  repair: boolean;
  latencyMs: number;
};

export type AiEvent =
  | (RouteFacts & {
      event: "ai.route.selected";
      runtimeKey: string;
      modelRef: string;
      policy: string;
      fallbackUsed: boolean;
      exclusions: readonly RouteExclusion[];
    })
  | (RouteFacts & {
      event: "ai.route.unavailable";
      errorCode: ProviderErrorCode;
      exclusions: readonly RouteExclusion[];
    })
  | (RequestFacts & {
      event: "ai.request.completed";
      totalTokens: number | null;
      usageSource: "PROVIDER_REPORTED" | "ESTIMATED" | "UNAVAILABLE";
    })
  | (RequestFacts & {
      event: "ai.request.failed";
      errorCode: ProviderErrorCode | "UNKNOWN";
      retryable: boolean;
    });

export function logAiEvent(event: AiEvent) {
  const line = JSON.stringify({
    ...event,
    ...("latencyMs" in event ? { latencyMs: Math.round(event.latencyMs) } : {}),
  });
  if (
    event.event === "ai.request.failed" ||
    event.event === "ai.route.unavailable"
  )
    console.warn(line);
  // Operational stdout is consumed by the process supervisor.
  // eslint-disable-next-line no-console
  else console.info(line);
}
