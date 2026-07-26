import { z } from "zod";
import { ProvenanceSchema } from "./content-item.schema";

export const CopyCategorySchema = z.enum(["SLOGAN", "HEADLINE", "PRODUCT_DESCRIPTION", "INSTITUTIONAL_COPY", "CALL_TO_ACTION", "EMAIL", "ADS_COPY", "SOCIAL_BIOGRAPHY", "COMPANY_INTRODUCTION"]);
export const CopyItemSchema = z.object({ title: z.string().min(1).max(200), category: CopyCategorySchema, purpose: z.string().min(1).max(1000), subject: z.string().min(1).max(500), content: z.string().min(1).max(12000), callToAction: z.string().max(500).nullable() }).strict();
export const CopyOutputSchema = z.object({ schemaVersion: z.literal("1.0"), items: z.array(CopyItemSchema).min(1).max(20), provenance: ProvenanceSchema }).strict();
export type CopyOutput = z.infer<typeof CopyOutputSchema>;
