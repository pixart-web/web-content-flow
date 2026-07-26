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
}) {
  const env = getServerEnv();
  const real =
    env.AI_REAL_GENERATION_ENABLED && env.AI_PROVIDER_DEFAULT === "OPENAI";
  return {
    mode: real ? ("REAL" as const) : ("MOCK" as const),
    provider: real ? ("OPENAI" as const) : ("MOCK" as const),
    modelTier: "STANDARD" as const,
    modelId: real ? env.OPENAI_MODEL_STANDARD : "deterministic-mock-v1",
    promptKey: input.promptKey,
    promptVersion: input.promptVersion ?? "1.0.0",
    generationPurpose: input.purpose ?? ("MODULE_GENERATION" as const),
    ...(input.briefRevision ? { briefRevision: input.briefRevision } : {}),
  };
}
