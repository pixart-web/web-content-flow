import { z } from "zod";
import { ProvenanceSchema } from "./content-item.schema";

const Text = z.string().trim().min(1).max(6000);
export const WebsiteSectionSchema = z.object({ type: z.string().min(1).max(64), eyebrow: z.string().max(160).nullable(), headline: z.string().min(1).max(240), body: Text, proofPlaceholder: z.string().max(500).nullable(), callToAction: z.string().max(240).nullable(), notes: z.string().max(1000).nullable() }).strict();
export const WebsitePageSchema = z.object({ name: z.string().min(1).max(120), slugSuggestion: z.string().regex(/^\/[a-z0-9/-]*$/), purpose: Text, navigationLabel: z.string().min(1).max(80), seoTitle: z.string().min(1).max(120), seoDescription: z.string().min(1).max(320), sections: z.array(WebsiteSectionSchema).min(1).max(15) }).strict();
export const WebsiteOutputSchema = z.object({ schemaVersion: z.literal("1.0"), sitePurpose: Text, pages: z.array(WebsitePageSchema).min(1).max(10), provenance: ProvenanceSchema }).strict();
export type WebsiteOutput = z.infer<typeof WebsiteOutputSchema>;
