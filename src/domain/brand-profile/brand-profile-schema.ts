import { z } from "zod";

import { ProvenanceSchema } from "@/domain/shared/schemas";

export const BRAND_PROFILE_SCHEMA_VERSION = "1.0" as const;
const text = z.string().trim().min(1).max(4000);
const short = z.string().trim().min(1).max(240);
const list = z.array(short).min(1).max(12);

export const BrandProfileSchema = z
  .object({
    schemaVersion: z.literal(BRAND_PROFILE_SCHEMA_VERSION),
    brandSummary: text,
    positioning: text,
    valueProposition: text,
    mission: text,
    vision: text,
    values: list,
    targetAudienceSummary: text,
    customerProblem: text,
    brandPromise: text,
    slogan: short,
    personality: list,
    toneOfVoice: list,
    writingGuidelines: list,
    wordsToUse: z.array(short).max(30),
    wordsToAvoid: z.array(short).max(30),
    visualDirection: text,
    colorPalette: z
      .array(
        z
          .object({
            name: short,
            hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            role: short,
          })
          .strict(),
      )
      .min(1)
      .max(12),
    typographyRecommendations: list,
    imageDirection: text,
    reusableImagePrompt: z.string().trim().min(1).max(6000),
    keyMarketingMessages: list,
    primaryCallsToAction: list,
    provenance: ProvenanceSchema,
  })
  .strict();

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
