import { CURRENT_PROMPT_VERSION } from "@/ai/prompts/registry";
import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function getNewJobGenerationConfiguration(input: {
  promptKey: string;
  promptVersion?: string;
  briefRevision?: number;
  purpose?:
    | "MODULE_GENERATION"
    | "ITEM_GENERATION"
    | "WHOLE_ITEM_REGENERATION"
    | "SECTION_REGENERATION"
    | "FIELD_REGENERATION"
    | "VARIANT_REGENERATION"
    | "CALENDAR_PERIOD_REGENERATION"
    | "CALENDAR_ENTRY_REGENERATION";
  // Internal proof content (ADR-018) is deterministic by design and must never
  // be labelled as real generation.
  forceMock?: boolean;
}) {
  const env = getServerEnv();
  const real =
    !input.forceMock &&
    env.AI_REAL_GENERATION_ENABLED &&
    env.AI_PROVIDER_DEFAULT === "OPENAI";
  return {
    mode: real ? ("REAL" as const) : ("MOCK" as const),
    provider: real ? ("OPENAI" as const) : ("MOCK" as const),
    modelTier: "STANDARD" as const,
    modelId: real ? env.OPENAI_MODEL_STANDARD : "deterministic-mock-v1",
    promptKey: input.promptKey,
    promptVersion: input.promptVersion ?? CURRENT_PROMPT_VERSION,
    generationPurpose: input.purpose ?? ("MODULE_GENERATION" as const),
    ...(input.briefRevision ? { briefRevision: input.briefRevision } : {}),
  };
}
