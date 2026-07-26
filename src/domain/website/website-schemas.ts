import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";

export const WebsiteTypeSchema = z.enum([
  "BUSINESS",
  "SERVICE",
  "PORTFOLIO",
  "ECOMMERCE",
  "LANDING_PAGE",
  "OTHER",
]);

export const WebsitePageTypeSchema = z.enum([
  "HOME",
  "ABOUT",
  "SERVICES",
  "PRODUCTS",
  "CONTACT",
  "FAQ",
  "PRICING",
  "TESTIMONIALS",
  "CUSTOM",
]);

const CustomPageSchema = z
  .object({
    key: z.string().regex(/^custom-[a-z0-9-]{2,48}$/),
    name: z.string().trim().min(2).max(80),
    purpose: z.string().trim().min(2).max(500),
  })
  .strict();

export const WebsiteGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    websiteObjective: z.string().trim().min(2).max(1000),
    websiteType: WebsiteTypeSchema,
    selectedPages: z.array(WebsitePageTypeSchema).min(1).max(9),
    additionalPages: z.array(CustomPageSchema).max(3).default([]),
    primaryConversionAction: z.string().trim().min(2).max(240),
    seoFocus: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    mockScenario: z
      .enum([
        "success",
        "one-page-failure",
        "invalid-services-page",
        "timeout-home-page",
      ])
      .default("success"),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.selectedPages).size !== value.selectedPages.length) {
      context.addIssue({
        code: "custom",
        path: ["selectedPages"],
        message: "Choose each page only once.",
      });
    }
    if (
      value.websiteType !== "LANDING_PAGE" &&
      !value.selectedPages.includes("HOME")
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedPages"],
        message: "Home is required unless this is a landing page.",
      });
    }
    const total = value.selectedPages.length + value.additionalPages.length;
    if (total > 10) {
      context.addIssue({
        code: "custom",
        path: ["additionalPages"],
        message: "A Website generation can include at most 10 pages.",
      });
    }
  });

const BaseSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,64}$/),
  heading: z.string().trim().min(2).max(180),
});
const TextSectionSchema = BaseSectionSchema.extend({
  type: z.enum([
    "INTRO",
    "ABOUT",
    "PROBLEM_SOLUTION",
    "SOCIAL_PROOF",
    "CUSTOM",
  ]),
  body: z.string().trim().min(2).max(3000),
}).strict();
const ListSectionSchema = BaseSectionSchema.extend({
  type: z.enum(["BENEFITS", "FEATURES", "SERVICES", "PRICING"]),
  items: z
    .array(
      z
        .object({
          title: z.string().trim().min(2).max(160),
          description: z.string().trim().min(2).max(800),
        })
        .strict(),
    )
    .min(1)
    .max(8),
}).strict();
const ProcessSectionSchema = BaseSectionSchema.extend({
  type: z.literal("PROCESS"),
  steps: z
    .array(
      z
        .object({
          title: z.string().trim().min(2).max(160),
          description: z.string().trim().min(2).max(800),
        })
        .strict(),
    )
    .min(2)
    .max(8),
}).strict();
const FaqSectionSchema = BaseSectionSchema.extend({
  type: z.literal("FAQ"),
  items: z
    .array(
      z
        .object({
          question: z.string().trim().min(2).max(240),
          answer: z.string().trim().min(2).max(1200),
        })
        .strict(),
    )
    .min(1)
    .max(10),
}).strict();
const CtaSectionSchema = BaseSectionSchema.extend({
  type: z.literal("CTA"),
  body: z.string().trim().min(2).max(1000),
  callToAction: z.string().trim().min(2).max(160),
}).strict();

export const WebsiteSectionSchema = z.discriminatedUnion("type", [
  TextSectionSchema,
  ListSectionSchema,
  ProcessSectionSchema,
  FaqSectionSchema,
  CtaSectionSchema,
]);

export const WebsitePageSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    pageKey: z.string().regex(/^[a-z0-9-]{2,64}$/),
    pageType: WebsitePageTypeSchema,
    pageName: z.string().trim().min(2).max(80),
    purpose: z.string().trim().min(2).max(500),
    targetAudience: z.string().trim().min(2).max(1000),
    seo: z
      .object({
        title: z.string().trim().min(10).max(70),
        metaDescription: z.string().trim().min(20).max(180),
        primaryKeyword: z.string().trim().max(100).optional(),
        secondaryKeywords: z.array(z.string().trim().min(2).max(100)).max(8),
      })
      .strict(),
    hero: z
      .object({
        eyebrow: z.string().trim().max(100).optional(),
        headline: z.string().trim().min(2).max(180),
        supportingText: z.string().trim().min(2).max(600),
        primaryCTA: z.string().trim().min(2).max(120),
        secondaryCTA: z.string().trim().max(120).optional(),
      })
      .strict(),
    sections: z.array(WebsiteSectionSchema).min(1).max(16),
    finalCTA: z
      .object({
        heading: z.string().trim().min(2).max(180),
        body: z.string().trim().min(2).max(800),
        callToAction: z.string().trim().min(2).max(120),
      })
      .strict()
      .optional(),
    notes: z.string().trim().max(1000).optional(),
    provenance: ContentProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.sections.map((section) => section.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "Section IDs must be unique.",
      });
    }
  });

export type WebsiteGenerationRequest = z.infer<
  typeof WebsiteGenerationRequestSchema
>;
export type WebsitePageSnapshot = z.infer<typeof WebsitePageSnapshotSchema>;
export type WebsiteSection = z.infer<typeof WebsiteSectionSchema>;
export type WebsitePageType = z.infer<typeof WebsitePageTypeSchema>;
