import { z } from "zod";
import { ProvenanceSchema } from "./content-item.schema";

const Text = z.string().trim().min(1).max(6000);
const SceneSchema = z.object({ order: z.number().int().positive(), timeEstimateSeconds: z.number().int().min(1).max(600), action: Text, onScreenText: z.string().max(1000), voiceOver: z.string().max(4000), visualDirection: Text, cameraDirection: z.string().max(1000), transitionSuggestion: z.string().max(500), musicSuggestion: z.string().max(500), visualPrompt: z.string().max(4000) }).strict();
const ScriptSchema = z.object({ title: z.string().min(1).max(200), platform: z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK"]), estimatedDurationSeconds: z.number().int().min(5).max(600), objective: Text, hook: z.string().min(1).max(1000), callToAction: z.string().min(1).max(500), scenes: z.array(SceneSchema).min(1).max(30) }).strict();
export const VideoOutputSchema = z.object({ schemaVersion: z.literal("1.0"), scripts: z.array(ScriptSchema).min(1).max(10), provenance: ProvenanceSchema }).strict();
export type VideoOutput = z.infer<typeof VideoOutputSchema>;
