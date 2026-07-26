import { z } from "zod";

export const ExportFormatSchema = z.enum([
  "PLAIN_TEXT",
  "MARKDOWN",
  "JSON",
  "CSV",
]);
export const ExportScopeSchema = z.enum([
  "SINGLE_ITEM",
  "SELECTED_ITEMS",
  "MODULE",
  "LIBRARY_FILTER",
  "CALENDAR",
  "PROJECT_PACKAGE",
]);
export const ExportRequestSchema = z
  .object({
    format: ExportFormatSchema,
    scope: ExportScopeSchema,
    itemIds: z.array(z.string().min(8).max(128)).max(50).default([]),
    versionIds: z.array(z.string().min(8).max(128)).max(50).default([]),
    module: z
      .enum(["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY", "CALENDAR"])
      .optional(),
  })
  .strict();

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
