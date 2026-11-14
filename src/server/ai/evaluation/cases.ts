import "server-only";

import type { z } from "zod";

import { loadPromptCatalog, getPrompt } from "@/ai/prompts/registry";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import {
  CopyGenerationRequestSchema,
  getGeneralCopySchema,
  type GeneralCopyType,
} from "@/domain/copy/copy-schemas";
import { MockProvider } from "@/server/ai/providers/mock-provider";

// Fixed, synthetic evaluation inputs (fictional UrbanStride brand). The suite
// version changes whenever cases or scoring change, so reports stay comparable.
export const EVALUATION_SUITE_VERSION = "1.1.0";

const brief = {
  schemaVersion: "1.0",
  project: {
    projectName: "UrbanStride Launch",
    brandName: "UrbanStride",
    projectType: "E-commerce",
    businessDescription: "An online footwear business for urban commuters.",
    productOrService: "Comfortable walking shoes designed for daily city use.",
    currentWebsite: "https://example.invalid",
  },
  audience: {
    targetAudience: "Urban professionals who walk or commute daily",
    ageRange: "25–45",
    location: "European cities",
    interests: ["walking", "design"],
    customerProblem: "Daily footwear is uncomfortable or visually generic.",
    valueProposition: "Comfort and considered design for every city journey.",
  },
  objective: {
    primaryObjective: "Launch the first direct-to-consumer collection",
    desiredCustomerAction: "Explore the collection",
    primaryOffer: "Versatile city shoes with all-day comfort",
    campaignContext: "Fictional launch campaign",
  },
  direction: {
    toneOfVoice: "Clear, confident, practical",
    visualStyle: "Editorial urban photography with structured layouts",
    preferredColors: ["navy", "blue"],
    colorsToAvoid: ["neon"],
    keywords: ["movement", "comfort"],
    competitors: [],
    referenceWebsites: [],
  },
  languageModules: {
    outputLanguage: "English",
    selectedModules: ["WEBSITE", "SOCIAL"],
  },
} as const;

export type EvaluationCase = Readonly<{
  id: string;
  promptKey: string;
  schema: z.ZodType<unknown>;
  context: unknown;
  systemInstructions: string;
  userMessage: string;
  maximumOutputTokens: number;
  repair: "NONE" | "STRUCTURE_ONCE";
  safetyNotes: readonly string[];
  wordsToAvoid: readonly string[];
}>;

const copyTypes: readonly GeneralCopyType[] = [
  "MARKETING_EMAIL",
  "PRODUCT_DESCRIPTION",
  "FAQ_DOCUMENT",
];

export async function buildEvaluationCases(): Promise<EvaluationCase[]> {
  await loadPromptCatalog();
  const brandProfile = (
    await new MockProvider().generateStructured(
      {
        input: brief,
        requestId: "evaluation-brand-profile",
        model: "deterministic-mock-v1",
        promptVersion: "1.0.0",
        schemaVersion: "1.0",
        timeoutMs: 10_000,
      },
      BrandProfileSchema,
    )
  ).data;
  const settings = CopyGenerationRequestSchema.parse({
    schemaVersion: "1.0",
    campaignName: "UrbanStride fictional launch",
    copyTypes,
    quantity: copyTypes.length,
    purpose: "CONVERT",
    topic: "Comfort and considered design for every city journey",
    audience: {
      summary: "Urban professionals who walk or commute daily",
      awarenessLevel: "SOLUTION_AWARE",
      painPoints: ["Uncomfortable daily footwear"],
      desiredOutcomes: ["Comfort throughout the day"],
    },
    productOrServiceFocus: "UrbanStride city footwear",
    desiredAction: "Explore the fictional collection",
    toneOverride: "BRAND_DEFAULT",
    lengthPreference: { value: "MEDIUM" },
    outputLanguage: "English",
  });

  const definitions: {
    id: string;
    promptKey: string;
    schema: z.ZodType<unknown>;
    context: unknown;
  }[] = [
    {
      id: "brand_profile",
      promptKey: "brand_profile.brand_profile.generation",
      schema: BrandProfileSchema,
      context: { briefRevision: 1, brief },
    },
    ...copyTypes.map((contentType, index) => ({
      id: `copy.${contentType.toLocaleLowerCase()}`,
      promptKey: `copy.${contentType.toLocaleLowerCase()}.generation`,
      schema: getGeneralCopySchema(contentType) as z.ZodType<unknown>,
      context: {
        request: {
          kind: "COPY_ITEM_NEW",
          itemKey: `evaluation-${contentType.toLocaleLowerCase()}`,
          contentType,
          ordinal: index + 1,
          settings,
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    })),
  ];

  return definitions.map((definition) => {
    const prompt = getPrompt(definition.promptKey, "1.0.0");
    if (!prompt)
      throw new Error(
        `Evaluation case ${definition.id} has no registered prompt.`,
      );
    const context = prompt.inputSchema.parse(definition.context);
    return {
      ...definition,
      context,
      systemInstructions: prompt.systemInstructions,
      userMessage: prompt.buildUserMessage(context),
      maximumOutputTokens: prompt.maximumOutputTokens,
      repair: prompt.repairPolicy,
      safetyNotes: prompt.safetyNotes,
      wordsToAvoid: brandProfile.wordsToAvoid,
    };
  });
}
