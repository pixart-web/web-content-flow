import { z } from "zod";
import { ProvenanceSchema } from "./content-item.schema";

export const SocialPlatformSchema = z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK"]);
export const SocialFormatSchema = z.enum(["POST", "CAROUSEL", "STORY", "REEL_CONCEPT"]);
export const SocialObjectiveSchema = z.enum(["EDUCATIONAL", "PROMOTIONAL", "AUTHORITY", "ENGAGEMENT"]);
export const SocialItemSchema = z.object({ title: z.string().min(1).max(200), objective: SocialObjectiveSchema, format: SocialFormatSchema, platform: SocialPlatformSchema, visualIdea: z.string().min(1).max(2000), caption: z.string().min(1).max(6000), hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u).max(80)).max(30), callToAction: z.string().min(1).max(240), suggestedDate: z.string().date().nullable() }).strict();
export const SocialOutputSchema = z.object({ schemaVersion: z.literal("1.0"), items: z.array(SocialItemSchema).min(1).max(30), provenance: ProvenanceSchema }).strict();
export type SocialOutput = z.infer<typeof SocialOutputSchema>;
