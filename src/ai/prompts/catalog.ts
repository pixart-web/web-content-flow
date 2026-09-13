import { z } from "zod";

import {
  AdsContentTypeSchema,
  AdsSnapshotSchema,
} from "@/domain/ads/ads-schemas";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import {
  CalendarContentTypeSchema,
  CalendarSnapshotSchema,
} from "@/domain/calendar/calendar-schemas";
import {
  GeneralCopySnapshotSchema,
  GeneralCopyTypeSchema,
} from "@/domain/copy/copy-schemas";
import {
  SocialContentTypeSchema,
  SocialSnapshotSchema,
} from "@/domain/social/social-schemas";
import {
  VideoContentTypeSchema,
  VideoSnapshotSchema,
} from "@/domain/video/video-schemas";
import {
  WebsitePageSnapshotSchema,
  WebsitePageTypeSchema,
} from "@/domain/website/website-schemas";
import { createModulePrompt } from "@/ai/prompts/registry";

const RuntimePromptInputSchema = z.unknown().superRefine((value, context) => {
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "Context must be serializable.",
    });
    return;
  }
  if (serialized.length > 2_000_000)
    context.addIssue({ code: "custom", message: "Context is too large." });
});

const registrations = [
  {
    module: "BRAND_PROFILE" as const,
    types: ["BRAND_PROFILE"],
    output: BrandProfileSchema,
  },
  {
    module: "WEBSITE" as const,
    types: WebsitePageTypeSchema.options,
    output: WebsitePageSnapshotSchema,
  },
  {
    module: "SOCIAL" as const,
    types: SocialContentTypeSchema.options,
    output: SocialSnapshotSchema,
  },
  {
    module: "ADS" as const,
    types: AdsContentTypeSchema.options,
    output: AdsSnapshotSchema,
  },
  {
    module: "VIDEO" as const,
    types: VideoContentTypeSchema.options,
    output: VideoSnapshotSchema,
  },
  {
    module: "COPY" as const,
    types: GeneralCopyTypeSchema.options,
    output: GeneralCopySnapshotSchema,
  },
  {
    module: "CALENDAR" as const,
    types: CalendarContentTypeSchema.options,
    output: CalendarSnapshotSchema,
  },
] as const;

for (const registration of registrations)
  for (const contentType of registration.types)
    createModulePrompt({
      key: `${registration.module.toLocaleLowerCase()}.${contentType.toLocaleLowerCase()}.generation`,
      module: registration.module,
      contentType,
      purpose:
        registration.module === "BRAND_PROFILE"
          ? "ITEM_GENERATION"
          : "MODULE_GENERATION",
      inputSchema: RuntimePromptInputSchema,
      outputSchema: registration.output as z.ZodType<unknown>,
      maximumOutputTokens: registration.module === "WEBSITE" ? 20_000 : 12_000,
    });

export const promptCatalogLoaded = true;
