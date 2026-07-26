import { z } from "zod";
import { ProvenanceSchema } from "./content-item.schema";

const Text = z.string().trim().min(1).max(4000);
const Short = z.string().trim().min(1).max(240);
const List = z.array(Short).min(1).max(12);

export const BrandProfileSchema = z.object({
  schemaVersion: z.literal("1.0"),
  brandSummary: Text,
  positioning: Text,
  valueProposition: Text,
  mission: Text,
  vision: Text,
  values: List,
  targetAudienceSummary: Text,
  customerProblem: Text,
  brandPromise: Text,
  slogan: Short,
  personality: List,
  toneOfVoice: List,
  writingGuidelines: List,
  wordsToUse: z.array(Short).max(30),
  wordsToAvoid: z.array(Short).max(30),
  visualDirection: Text,
  colorPalette: z.array(z.object({ name: Short, hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/), role: Short }).strict()).min(1).max(12),
  typographyRecommendations: List,
  imageDirection: Text,
  reusableImagePrompt: z.string().trim().min(1).max(6000),
  keyMarketingMessages: List,
  primaryCallsToAction: List,
  provenance: ProvenanceSchema,
}).strict();

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
