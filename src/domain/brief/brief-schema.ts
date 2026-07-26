import { z } from "zod";

export const BRIEF_SCHEMA_VERSION = "1.0" as const;

const requiredText = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required.`)
    .max(max, `${label} is too long.`);
const optionalText = (max = 1000) => z.string().trim().max(max).optional();
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine(
    (value) => !value || z.url().safeParse(value).success,
    "Enter a valid URL.",
  );
const shortList = z
  .array(z.string().trim().min(1).max(100))
  .max(12)
  .default([]);
const urlList = z.array(z.url().max(500)).max(8).default([]);

export const ProjectTypeSchema = z.enum([
  "E-commerce",
  "Service",
  "SaaS",
  "Personal brand",
  "Campaign",
  "Other",
]);
export const ContentModuleSchema = z.enum([
  "WEBSITE",
  "SOCIAL",
  "ADS",
  "VIDEO",
  "COPY",
]);

export const ProjectSectionSchema = z
  .object({
    projectName: requiredText("Project name", 120),
    brandName: requiredText("Brand name", 120),
    projectType: ProjectTypeSchema,
    businessDescription: requiredText("Business description", 3000),
    productOrService: requiredText("Product or service", 2000),
    currentWebsite: optionalUrl,
  })
  .strict();

export const AudienceSectionSchema = z
  .object({
    targetAudience: requiredText("Target audience", 2000),
    ageRange: optionalText(120),
    location: optionalText(240),
    interests: shortList,
    customerProblem: requiredText("Customer problem", 2000),
    valueProposition: requiredText("Value proposition", 2000),
  })
  .strict();

export const ObjectiveSectionSchema = z
  .object({
    primaryObjective: requiredText("Primary objective", 1000),
    desiredCustomerAction: requiredText("Desired customer action", 500),
    primaryOffer: requiredText("Primary offer", 1200),
    campaignContext: optionalText(1500),
  })
  .strict();

export const DirectionSectionSchema = z
  .object({
    toneOfVoice: requiredText("Tone of voice", 500),
    visualStyle: optionalText(1000),
    preferredColors: shortList,
    colorsToAvoid: shortList,
    keywords: shortList,
    competitors: shortList,
    referenceWebsites: urlList,
  })
  .strict();

export const LanguageModulesSectionSchema = z
  .object({
    outputLanguage: requiredText("Output language", 80),
    selectedModules: z.array(ContentModuleSchema).max(5).default([]),
  })
  .strict();

export const ProjectBriefSchema = z
  .object({
    schemaVersion: z.literal(BRIEF_SCHEMA_VERSION),
    project: ProjectSectionSchema,
    audience: AudienceSectionSchema,
    objective: ObjectiveSectionSchema,
    direction: DirectionSectionSchema,
    languageModules: LanguageModulesSectionSchema,
  })
  .strict();

export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;

const draftText = (max: number) => z.string().trim().max(max);
const draftUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || z.url().safeParse(value).success,
    "Enter a valid URL.",
  )
  .optional();

export const ProjectBriefDraftSchema = z
  .object({
    schemaVersion: z.literal(BRIEF_SCHEMA_VERSION),
    project: z
      .object({
        projectName: draftText(120),
        brandName: draftText(120),
        projectType: ProjectTypeSchema,
        businessDescription: draftText(3000),
        productOrService: draftText(2000),
        currentWebsite: draftUrl,
      })
      .strict(),
    audience: z
      .object({
        targetAudience: draftText(2000),
        ageRange: draftText(120).optional(),
        location: draftText(240).optional(),
        interests: shortList,
        customerProblem: draftText(2000),
        valueProposition: draftText(2000),
      })
      .strict(),
    objective: z
      .object({
        primaryObjective: draftText(1000),
        desiredCustomerAction: draftText(500),
        primaryOffer: draftText(1200),
        campaignContext: draftText(1500).optional(),
      })
      .strict(),
    direction: z
      .object({
        toneOfVoice: draftText(500),
        visualStyle: draftText(1000).optional(),
        preferredColors: shortList,
        colorsToAvoid: shortList,
        keywords: shortList,
        competitors: shortList,
        referenceWebsites: urlList,
      })
      .strict(),
    languageModules: z
      .object({
        outputLanguage: draftText(80),
        selectedModules: z.array(ContentModuleSchema).max(5).default([]),
      })
      .strict(),
  })
  .strict();

export const emptyProjectBrief: ProjectBrief = {
  schemaVersion: BRIEF_SCHEMA_VERSION,
  project: {
    projectName: "",
    brandName: "",
    projectType: "Other",
    businessDescription: "",
    productOrService: "",
  },
  audience: {
    targetAudience: "",
    interests: [],
    customerProblem: "",
    valueProposition: "",
  },
  objective: {
    primaryObjective: "",
    desiredCustomerAction: "",
    primaryOffer: "",
  },
  direction: {
    toneOfVoice: "",
    preferredColors: [],
    colorsToAvoid: [],
    keywords: [],
    competitors: [],
    referenceWebsites: [],
  },
  languageModules: {
    outputLanguage: "English",
    selectedModules: [],
  },
};
