import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/<[a-z][\s\S]*>/i.test(value), "HTML is not allowed.");
const stableId = z.string().regex(/^[a-z0-9-]{3,64}$/);
const list = (min = 0, max = 12, itemMax = 500) =>
  z
    .array(text(1, itemMax))
    .min(min)
    .max(max)
    .superRefine((values, context) => {
      if (
        new Set(values.map((value) => value.toLocaleLowerCase())).size !==
        values.length
      )
        context.addIssue({ code: "custom", message: "Values must be unique." });
    });
const ordered = (
  values: readonly { id: string; ordinal: number }[],
  context: z.RefinementCtx,
) => {
  if (new Set(values.map(({ id }) => id)).size !== values.length)
    context.addIssue({ code: "custom", message: "IDs must be unique." });
  if (new Set(values.map(({ ordinal }) => ordinal)).size !== values.length)
    context.addIssue({
      code: "custom",
      message: "Order values must be unique.",
    });
};

export const GeneralCopyTypeSchema = z.enum([
  "MARKETING_EMAIL",
  "NEWSLETTER",
  "PRODUCT_DESCRIPTION",
  "SERVICE_DESCRIPTION",
  "BLOG_OUTLINE",
  "ARTICLE_DRAFT",
  "PRESS_RELEASE",
  "ANNOUNCEMENT",
  "FAQ_DOCUMENT",
  "CASE_STUDY_OUTLINE",
  "PROPOSAL_SUMMARY",
  "SALES_ONE_PAGER",
  "COMPANY_BIO",
  "EXECUTIVE_BIO",
  "COPY_BLOCK",
]);
export const CopyPurposeSchema = z.enum([
  "INFORM",
  "EDUCATE",
  "PERSUADE",
  "CONVERT",
  "ANNOUNCE",
  "NURTURE",
  "EXPLAIN",
  "POSITION",
  "RETAIN",
  "SUPPORT_SALES",
]);
export const CopyToneSchema = z.enum([
  "BRAND_DEFAULT",
  "PROFESSIONAL",
  "FRIENDLY",
  "CONVERSATIONAL",
  "CONFIDENT",
  "AUTHORITATIVE",
  "EMPATHETIC",
  "PREMIUM",
  "DIRECT",
  "PLAYFUL",
]);
export const CopyLengthPreferenceSchema = z.enum([
  "SHORT",
  "MEDIUM",
  "LONG",
  "CUSTOM",
]);
export const AudienceAwarenessLevelSchema = z.enum([
  "UNAWARE",
  "PROBLEM_AWARE",
  "SOLUTION_AWARE",
  "PRODUCT_AWARE",
  "MOST_AWARE",
]);
export const SearchIntentSchema = z.enum([
  "INFORMATIONAL",
  "COMMERCIAL",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
]);
export const CopyBlockTypeSchema = z.enum([
  "HEADLINE",
  "SUBHEADLINE",
  "CALL_TO_ACTION",
  "VALUE_PROPOSITION",
  "TAGLINE",
  "ELEVATOR_PITCH",
  "DISCLAIMER_DRAFT",
  "INTRODUCTION",
  "CLOSING",
  "CUSTOM",
]);
export const CopyMockScenarioSchema = z.enum([
  "success",
  "one-item-failure",
  "invalid-email-sections",
  "invalid-article-length",
  "duplicate-faq-id",
  "invalid-press-release",
  "timeout-product-description",
  "unsupported-fact-claim",
]);
export const CopyFieldTargetSchema = z.enum([
  "SUBJECT_LINE",
  "PREVIEW_TEXT",
  "OPENING",
  "CALL_TO_ACTION",
  "SHORT_DESCRIPTION",
  "FULL_DESCRIPTION",
  "KEY_BENEFITS",
  "HEADLINE",
  "INTRODUCTION",
  "CONCLUSION",
  "META_DESCRIPTION",
  "FAQ_ANSWER",
  "BOILERPLATE",
  "VALUE_PROPOSITION",
  "BIO_SHORT",
  "BIO_LONG",
]);
export const CopyRegenerationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SECTION"), sectionId: stableId }).strict(),
  z
    .object({
      kind: z.literal("FIELD"),
      field: CopyFieldTargetSchema,
      sectionId: stableId.optional(),
    })
    .strict(),
]);

export const CopyGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    campaignName: text(2, 100).optional(),
    copyTypes: z
      .array(GeneralCopyTypeSchema)
      .min(1)
      .max(15)
      .superRefine((values, context) => {
        if (new Set(values).size !== values.length)
          context.addIssue({
            code: "custom",
            message: "Choose each copy type only once.",
          });
      }),
    quantity: z.number().int().min(1).max(20),
    purpose: CopyPurposeSchema,
    topic: text(2, 1000),
    audience: z
      .object({
        summary: text(2, 1000),
        awarenessLevel: AudienceAwarenessLevelSchema.optional(),
        painPoints: list(0, 10).optional(),
        desiredOutcomes: list(0, 10).optional(),
        objections: list(0, 10).optional(),
      })
      .strict(),
    subjectFocus: text(2, 500).optional(),
    productOrServiceFocus: text(2, 500).optional(),
    proofPoints: list(0, 12).optional(),
    mandatoryMessages: list(0, 12).optional(),
    prohibitedMessages: list(0, 12).optional(),
    desiredAction: text(2, 240).optional(),
    toneOverride: CopyToneSchema.default("BRAND_DEFAULT"),
    lengthPreference: z
      .object({
        value: CopyLengthPreferenceSchema,
        customWordTarget: z.number().int().min(25).max(4000).optional(),
      })
      .strict(),
    outputLanguage: text(2, 80),
    seoContext: z
      .object({
        primaryKeyword: text(1, 100).optional(),
        secondaryKeywords: list(0, 10, 100).optional(),
        searchIntent: SearchIntentSchema.optional(),
      })
      .strict()
      .optional(),
    notes: text(1, 1500).optional(),
    mockScenario: CopyMockScenarioSchema.default("success"),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.lengthPreference.value === "CUSTOM" &&
      value.lengthPreference.customWordTarget === undefined
    )
      context.addIssue({
        code: "custom",
        path: ["lengthPreference", "customWordTarget"],
        message: "Enter an approximate word target from 25 to 4000.",
      });
    if (
      value.lengthPreference.value !== "CUSTOM" &&
      value.lengthPreference.customWordTarget !== undefined
    )
      context.addIssue({
        code: "custom",
        path: ["lengthPreference", "customWordTarget"],
        message: "A custom word target requires custom length.",
      });
  });

const base = z.object({
  schemaVersion: z.literal("1.0"),
  contentType: GeneralCopyTypeSchema,
  purpose: CopyPurposeSchema,
  tone: CopyToneSchema,
  lengthPreference: CopyLengthPreferenceSchema,
  audienceAwareness: AudienceAwarenessLevelSchema.optional(),
  title: text(2, 200),
  campaignName: text(2, 100).optional(),
  provenance: ContentProvenanceSchema,
});
const section = z
  .object({
    id: stableId,
    ordinal: z.number().int().min(1).max(30),
    heading: text(1, 300).optional(),
    body: text(2, 8000),
  })
  .strict();
const orderedArray = <T extends z.ZodType<{ id: string; ordinal: number }>>(
  schema: T,
  min: number,
  max: number,
) =>
  z
    .array(schema)
    .min(min)
    .max(max)
    .superRefine((values, context) => ordered(values, context));

export const MarketingEmailSnapshotSchema = base
  .extend({
    contentType: z.literal("MARKETING_EMAIL"),
    subjectLine: text(2, 200),
    previewText: text(1, 300).optional(),
    greeting: text(1, 200).optional(),
    opening: text(2, 1500),
    bodySections: orderedArray(section, 1, 10),
    callToAction: z
      .object({
        label: text(1, 160),
        destinationDescription: text(1, 300).optional(),
      })
      .strict()
      .optional(),
    closing: text(1, 500).optional(),
    signatureGuidance: text(1, 500).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const NewsletterSnapshotSchema = base
  .extend({
    contentType: z.literal("NEWSLETTER"),
    subjectLine: text(2, 200),
    previewText: text(1, 300).optional(),
    editionLabel: text(1, 100).optional(),
    introduction: text(2, 2000),
    sections: orderedArray(
      section.extend({
        heading: text(2, 300),
        summary: text(1, 500).optional(),
        callToAction: text(1, 200).optional(),
      }),
      1,
      12,
    ),
    closing: text(1, 1000).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const ProductDescriptionSnapshotSchema = base
  .extend({
    contentType: z.literal("PRODUCT_DESCRIPTION"),
    productName: text(2, 200),
    shortDescription: text(2, 600),
    fullDescription: text(2, 6000),
    keyBenefits: list(1, 12),
    keyFeatures: list(1, 12),
    idealFor: list(0, 10).optional(),
    differentiators: list(0, 10).optional(),
    usageGuidance: text(1, 1000).optional(),
    callToAction: text(1, 200).optional(),
    seoTitle: text(1, 70).optional(),
    metaDescription: text(1, 180).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const ServiceDescriptionSnapshotSchema = base
  .extend({
    contentType: z.literal("SERVICE_DESCRIPTION"),
    serviceName: text(2, 200),
    shortDescription: text(2, 600),
    fullDescription: text(2, 6000),
    clientChallenges: list(1, 12),
    approach: list(1, 12),
    deliverables: list(1, 12),
    benefits: list(1, 12),
    idealClient: text(1, 1000).optional(),
    processSummary: text(1, 1500).optional(),
    callToAction: text(1, 200).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const BlogOutlineSnapshotSchema = base
  .extend({
    contentType: z.literal("BLOG_OUTLINE"),
    workingTitle: text(2, 300),
    audienceIntent: text(2, 500),
    primaryKeyword: text(1, 100).optional(),
    secondaryKeywords: list(0, 10, 100).optional(),
    thesis: text(2, 1000),
    introductionGuidance: text(2, 1500),
    sections: orderedArray(
      z
        .object({
          id: stableId,
          ordinal: z.number().int().min(1).max(20),
          heading: text(2, 300),
          keyPoints: list(1, 10),
          examplesOrEvidence: list(0, 8).optional(),
          transitionGuidance: text(1, 500).optional(),
        })
        .strict(),
      2,
      15,
    ),
    conclusionGuidance: text(2, 1500),
    callToAction: text(1, 200).optional(),
    estimatedLengthWords: z.number().int().min(100).max(4000).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const ArticleDraftSnapshotSchema = base
  .extend({
    contentType: z.literal("ARTICLE_DRAFT"),
    headline: text(2, 300),
    dek: text(1, 500).optional(),
    introduction: text(2, 5000),
    sections: orderedArray(section, 2, 20),
    conclusion: text(2, 5000),
    callToAction: text(1, 200).optional(),
    seoTitle: text(1, 70).optional(),
    metaDescription: text(1, 180).optional(),
    primaryKeyword: text(1, 100).optional(),
    secondaryKeywords: list(0, 10, 100).optional(),
    factCheckNotes: list(0, 12).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const total = [
      value.introduction,
      value.conclusion,
      ...value.sections.map(({ body }) => body),
    ].join(" ").length;
    if (total > 40_000)
      context.addIssue({
        code: "custom",
        message: "Article draft exceeds the editorial length limit.",
      });
  });
export const PressReleaseSnapshotSchema = base
  .extend({
    contentType: z.literal("PRESS_RELEASE"),
    headline: text(2, 300),
    subheadline: text(1, 500).optional(),
    dateline: text(1, 200).optional(),
    lead: text(2, 2000),
    bodySections: orderedArray(section, 1, 10),
    quotePlaceholders: z
      .array(
        z
          .object({
            id: stableId,
            speakerRole: text(2, 200),
            quoteDraft: text(2, 1000),
          })
          .strict(),
      )
      .max(5)
      .superRefine((values, context) => {
        if (new Set(values.map(({ id }) => id)).size !== values.length)
          context.addIssue({
            code: "custom",
            message: "Quote IDs must be unique.",
          });
      })
      .optional(),
    boilerplate: text(2, 2000),
    mediaContactPlaceholder: text(1, 300).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const AnnouncementSnapshotSchema = base
  .extend({
    contentType: z.literal("ANNOUNCEMENT"),
    audience: text(2, 500),
    headline: text(2, 300),
    opening: text(2, 1500),
    details: orderedArray(section, 1, 10),
    effectiveDateText: text(1, 200).optional(),
    requiredAction: text(1, 500).optional(),
    callToAction: text(1, 200).optional(),
    closing: text(1, 500).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const FaqDocumentSnapshotSchema = base
  .extend({
    contentType: z.literal("FAQ_DOCUMENT"),
    introduction: text(1, 1500).optional(),
    entries: orderedArray(
      z
        .object({
          id: stableId,
          ordinal: z.number().int().min(1).max(30),
          question: text(2, 500),
          answer: text(2, 3000),
          category: text(1, 100).optional(),
        })
        .strict(),
      2,
      25,
    ),
    closing: text(1, 500).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const CaseStudyOutlineSnapshotSchema = base
  .extend({
    contentType: z.literal("CASE_STUDY_OUTLINE"),
    clientPlaceholder: text(1, 200).optional(),
    executiveSummaryGuidance: text(2, 1500),
    challenge: z
      .object({ summary: text(2, 1500), evidenceNeeded: list(1, 10) })
      .strict(),
    approach: z.object({ summary: text(2, 1500), steps: list(1, 12) }).strict(),
    results: z
      .object({ summaryGuidance: text(2, 1500), metricsNeeded: list(1, 10) })
      .strict(),
    testimonialPlaceholder: text(1, 500).optional(),
    lessons: list(1, 10),
    callToAction: text(1, 200).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const ProposalSummarySnapshotSchema = base
  .extend({
    contentType: z.literal("PROPOSAL_SUMMARY"),
    clientContext: text(2, 2000),
    objectives: list(1, 12),
    proposedApproach: list(1, 12),
    deliverables: list(1, 15),
    assumptions: list(1, 12),
    exclusions: list(1, 12),
    timelineGuidance: text(1, 500).optional(),
    investmentGuidance: text(1, 500).optional(),
    successCriteria: list(1, 12),
    nextSteps: list(1, 12),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const SalesOnePagerSnapshotSchema = base
  .extend({
    contentType: z.literal("SALES_ONE_PAGER"),
    headline: text(2, 300),
    subheadline: text(1, 500).optional(),
    problem: text(2, 1500),
    solution: text(2, 2000),
    benefits: list(1, 12),
    differentiators: list(1, 12),
    proofPoints: list(0, 10).optional(),
    howItWorks: list(0, 10).optional(),
    idealFor: list(0, 10).optional(),
    callToAction: text(2, 200),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const CompanyBioSnapshotSchema = base
  .extend({
    contentType: z.literal("COMPANY_BIO"),
    shortBio: text(2, 600),
    mediumBio: text(2, 1500),
    longBio: text(2, 4000),
    keyFacts: list(0, 12).optional(),
    positioningStatement: text(1, 500).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const ExecutiveBioSnapshotSchema = base
  .extend({
    contentType: z.literal("EXECUTIVE_BIO"),
    personNamePlaceholder: text(2, 200),
    rolePlaceholder: text(2, 200),
    shortBio: text(2, 600),
    longBio: text(2, 4000),
    expertiseAreas: list(0, 12).optional(),
    achievementPlaceholders: list(0, 12).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();
export const CopyBlockSnapshotSchema = base
  .extend({
    contentType: z.literal("COPY_BLOCK"),
    blockType: CopyBlockTypeSchema,
    text: text(2, 3000),
    alternatives: z
      .array(
        z
          .object({
            id: stableId,
            label: text(1, 100),
            text: text(2, 3000),
          })
          .strict(),
      )
      .max(8)
      .superRefine((values, context) => {
        if (new Set(values.map(({ id }) => id)).size !== values.length)
          context.addIssue({
            code: "custom",
            message: "Alternative IDs must be unique.",
          });
      })
      .optional(),
    usageGuidance: text(1, 1000).optional(),
    notes: text(1, 1500).optional(),
  })
  .strict();

export const GeneralCopySnapshotSchema = z.discriminatedUnion("contentType", [
  MarketingEmailSnapshotSchema,
  NewsletterSnapshotSchema,
  ProductDescriptionSnapshotSchema,
  ServiceDescriptionSnapshotSchema,
  BlogOutlineSnapshotSchema,
  ArticleDraftSnapshotSchema,
  PressReleaseSnapshotSchema,
  AnnouncementSnapshotSchema,
  FaqDocumentSnapshotSchema,
  CaseStudyOutlineSnapshotSchema,
  ProposalSummarySnapshotSchema,
  SalesOnePagerSnapshotSchema,
  CompanyBioSnapshotSchema,
  ExecutiveBioSnapshotSchema,
  CopyBlockSnapshotSchema,
]);

export function getGeneralCopySchema(type: GeneralCopyType) {
  switch (type) {
    case "MARKETING_EMAIL":
      return MarketingEmailSnapshotSchema;
    case "NEWSLETTER":
      return NewsletterSnapshotSchema;
    case "PRODUCT_DESCRIPTION":
      return ProductDescriptionSnapshotSchema;
    case "SERVICE_DESCRIPTION":
      return ServiceDescriptionSnapshotSchema;
    case "BLOG_OUTLINE":
      return BlogOutlineSnapshotSchema;
    case "ARTICLE_DRAFT":
      return ArticleDraftSnapshotSchema;
    case "PRESS_RELEASE":
      return PressReleaseSnapshotSchema;
    case "ANNOUNCEMENT":
      return AnnouncementSnapshotSchema;
    case "FAQ_DOCUMENT":
      return FaqDocumentSnapshotSchema;
    case "CASE_STUDY_OUTLINE":
      return CaseStudyOutlineSnapshotSchema;
    case "PROPOSAL_SUMMARY":
      return ProposalSummarySnapshotSchema;
    case "SALES_ONE_PAGER":
      return SalesOnePagerSnapshotSchema;
    case "COMPANY_BIO":
      return CompanyBioSnapshotSchema;
    case "EXECUTIVE_BIO":
      return ExecutiveBioSnapshotSchema;
    case "COPY_BLOCK":
      return CopyBlockSnapshotSchema;
  }
}

export const SECTION_COPY_TYPES = new Set<GeneralCopyType>([
  "MARKETING_EMAIL",
  "NEWSLETTER",
  "BLOG_OUTLINE",
  "ARTICLE_DRAFT",
  "PRESS_RELEASE",
  "ANNOUNCEMENT",
  "FAQ_DOCUMENT",
]);
export const COPY_FIELD_COMPATIBILITY: Readonly<
  Record<GeneralCopyType, readonly CopyFieldTarget[]>
> = {
  MARKETING_EMAIL: [
    "SUBJECT_LINE",
    "PREVIEW_TEXT",
    "OPENING",
    "CALL_TO_ACTION",
  ],
  NEWSLETTER: ["SUBJECT_LINE", "PREVIEW_TEXT", "INTRODUCTION", "CONCLUSION"],
  PRODUCT_DESCRIPTION: [
    "SHORT_DESCRIPTION",
    "FULL_DESCRIPTION",
    "KEY_BENEFITS",
    "CALL_TO_ACTION",
    "META_DESCRIPTION",
  ],
  SERVICE_DESCRIPTION: [
    "SHORT_DESCRIPTION",
    "FULL_DESCRIPTION",
    "KEY_BENEFITS",
    "CALL_TO_ACTION",
  ],
  BLOG_OUTLINE: ["HEADLINE", "INTRODUCTION", "CONCLUSION", "CALL_TO_ACTION"],
  ARTICLE_DRAFT: [
    "HEADLINE",
    "INTRODUCTION",
    "CONCLUSION",
    "CALL_TO_ACTION",
    "META_DESCRIPTION",
  ],
  PRESS_RELEASE: ["HEADLINE", "INTRODUCTION", "BOILERPLATE"],
  ANNOUNCEMENT: ["HEADLINE", "OPENING", "CALL_TO_ACTION", "CONCLUSION"],
  FAQ_DOCUMENT: ["INTRODUCTION", "FAQ_ANSWER", "CONCLUSION"],
  CASE_STUDY_OUTLINE: ["INTRODUCTION", "CALL_TO_ACTION"],
  PROPOSAL_SUMMARY: ["INTRODUCTION"],
  SALES_ONE_PAGER: [
    "HEADLINE",
    "VALUE_PROPOSITION",
    "KEY_BENEFITS",
    "CALL_TO_ACTION",
  ],
  COMPANY_BIO: ["BIO_SHORT", "BIO_LONG", "VALUE_PROPOSITION"],
  EXECUTIVE_BIO: ["BIO_SHORT", "BIO_LONG"],
  COPY_BLOCK: ["VALUE_PROPOSITION", "CALL_TO_ACTION"],
};

export type GeneralCopyType = z.infer<typeof GeneralCopyTypeSchema>;
export type CopyPurpose = z.infer<typeof CopyPurposeSchema>;
export type CopyFieldTarget = z.infer<typeof CopyFieldTargetSchema>;
export type CopyGenerationRequest = z.infer<typeof CopyGenerationRequestSchema>;
export type CopyRegenerationTarget = z.infer<
  typeof CopyRegenerationTargetSchema
>;
export type GeneralCopySnapshot = z.infer<typeof GeneralCopySnapshotSchema>;
