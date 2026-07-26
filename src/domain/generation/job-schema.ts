import { z } from "zod";

import {
  GenerationJobIdSchema,
  GenerationModeSchema,
  ProjectIdSchema,
  SafeJobErrorCodeSchema,
} from "@/domain/shared/schemas";

export const GenerationJobStatusSchema = z.enum([
  "PREPARING",
  "QUEUED",
  "RUNNING",
  "VALIDATING",
  "SAVING",
  "PARTIAL",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const GenerationJobViewSchema = z
  .object({
    id: GenerationJobIdSchema,
    projectId: ProjectIdSchema,
    status: GenerationJobStatusSchema,
    mode: GenerationModeSchema,
    attempt: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    safeErrorCode: SafeJobErrorCodeSchema.nullable(),
    steps: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        status: z.enum([
          "PENDING",
          "RUNNING",
          "COMPLETED",
          "FAILED",
          "CANCELLED",
        ]),
      }),
    ),
  })
  .strict();
