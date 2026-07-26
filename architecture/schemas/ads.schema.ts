import { z } from "zod";
import { ProvenanceSchema, } from "./content-item.schema";

const Text = z.string().trim().min(1).max(6000);
const VariationSchema = z.object({ label: z.string().min(1).max(40), headline: z.string().min(1).max(240), primaryText: Text, description: z.string().min(1).max(500), callToAction: z.string().min(1).max(120) }).strict();
const ConceptSchema = z.object({ title: z.string().min(1).max(200), salesAngle: Text, rationale: Text, visualConcept: Text, imageGenerationPrompt: z.string().min(1).max(6000), variations: z.array(VariationSchema).min(1).max(5) }).strict();
export const AdsOutputSchema = z.object({ schemaVersion: z.literal("1.0"), campaign: z.object({ name: z.string().min(1).max(200), platform: z.string().min(1).max(80), audience: Text, objective: Text, offer: Text }).strict(), concepts: z.array(ConceptSchema).min(1).max(10), provenance: ProvenanceSchema }).strict();
export type AdsOutput = z.infer<typeof AdsOutputSchema>;
