import type { z } from "zod";

import { BRAND_AUTHORITY_INSTRUCTIONS } from "./shared/instructions";
import type {
  GenerationModelTier,
  GenerationPurpose,
} from "@/server/ai/ai-provider";

export type PromptDefinition<TInput, TOutput> = Readonly<{
  key: string;
  version: "1.0.0";
  module:
    | "BRAND_PROFILE"
    | "WEBSITE"
    | "SOCIAL"
    | "ADS"
    | "VIDEO"
    | "COPY"
    | "CALENDAR";
  purpose: GenerationPurpose;
  contentType: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  systemInstructions: string;
  buildUserMessage(input: TInput): string;
  modelTier: GenerationModelTier;
  maximumInputTokens: number;
  maximumOutputTokens: number;
  repairPolicy: "NONE" | "STRUCTURE_ONCE";
  safetyNotes: readonly string[];
}>;

const registry = new Map<string, PromptDefinition<unknown, unknown>>();

export function registerPrompt<TInput, TOutput>(
  definition: PromptDefinition<TInput, TOutput>,
) {
  const identity = `${definition.key}@${definition.version}`;
  if (registry.has(identity))
    throw new Error(`Duplicate prompt identity: ${identity}`);
  registry.set(identity, definition as PromptDefinition<unknown, unknown>);
  return definition;
}

export function getPrompt(key: string, version: string) {
  return registry.get(`${key}@${version}`) ?? null;
}

export function listPrompts() {
  return [...registry.values()];
}

export async function loadPromptCatalog() {
  await import("./catalog");
  return listPrompts();
}

export function createModulePrompt<TInput, TOutput>(input: {
  key: string;
  module: PromptDefinition<TInput, TOutput>["module"];
  contentType: string;
  purpose: GenerationPurpose;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  modelTier?: GenerationModelTier;
  maximumOutputTokens?: number;
}) {
  return registerPrompt({
    ...input,
    version: "1.0.0",
    systemInstructions: BRAND_AUTHORITY_INSTRUCTIONS,
    buildUserMessage: (context) =>
      JSON.stringify({
        task: input.key,
        untrustedGenerationContext: context,
      }),
    modelTier: input.modelTier ?? "STANDARD",
    maximumInputTokens: 120_000,
    maximumOutputTokens: input.maximumOutputTokens ?? 12_000,
    repairPolicy: "STRUCTURE_ONCE",
    safetyNotes: [
      "No tools or external retrieval.",
      "No fabricated proof.",
      "Application-controlled identifiers.",
    ],
  });
}
