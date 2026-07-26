import { z } from "zod";
import { ContentItemIdSchema, ProjectIdSchema } from "./content-item.schema";

export const ExportFormatSchema = z.enum(["MARKDOWN", "JSON", "TEXT"]);
export const ExportSelectionSchema = z.object({ schemaVersion: z.literal("1.0"), projectId: ProjectIdSchema, format: ExportFormatSchema, includeBrandProfile: z.boolean(), contentItemIds: z.array(ContentItemIdSchema).min(1).max(500), includeProvenance: z.boolean().default(true) }).strict();
export const ExportResultSchema = z.object({ schemaVersion: z.literal("1.0"), format: ExportFormatSchema, filename: z.string().min(1).max(240), mimeType: z.string().min(1).max(120), byteLength: z.number().int().nonnegative(), mockContentIncluded: z.boolean() }).strict();
export type ExportSelection = z.infer<typeof ExportSelectionSchema>;
export type ExportResult = z.infer<typeof ExportResultSchema>;
