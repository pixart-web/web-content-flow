import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { generateProductionSnapshot } from "@/server/ai/generation-executor";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  CopyGenerationRequestSchema,
  GeneralCopySnapshotSchema,
  getGeneralCopySchema,
  type CopyGenerationRequest,
  type CopyRegenerationTarget,
  type GeneralCopySnapshot,
  type GeneralCopyType,
} from "@/domain/copy/copy-schemas";

type Job = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
};
export type CopyItemRequest = {
  kind:
    | "COPY_ITEM_NEW"
    | "COPY_ITEM_REGENERATE"
    | "COPY_SECTION_REGENERATE"
    | "COPY_FIELD_REGENERATE";
  itemId?: string;
  itemKey?: string;
  contentType: GeneralCopyType;
  ordinal?: number;
  settings?: CopyGenerationRequest;
  expectedCurrentVersionId?: string;
  brandProfileVersionId: string;
  target?: CopyRegenerationTarget;
  scenario?: string;
};
const safeList = (values: readonly string[] | undefined, fallback: string) =>
  values?.length ? [...values] : [fallback];
const provenance = (jobId: string, brandProfileVersionId: string) =>
  ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-general-copy-v1",
    promptVersion: "general-copy-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });

export function createDeterministicCopySnapshot(
  request: CopyItemRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
): GeneralCopySnapshot {
  const settings = request.settings;
  const topic = settings?.topic ?? brand.valueProposition;
  const purpose = settings?.purpose ?? "INFORM";
  const cta =
    settings?.desiredAction ?? brand.primaryCallsToAction[0] ?? "Learn more";
  const subject =
    settings?.productOrServiceFocus ?? settings?.subjectFocus ?? topic;
  const common = {
    schemaVersion: "1.0" as const,
    contentType: request.contentType,
    purpose,
    tone: settings?.toneOverride ?? "BRAND_DEFAULT",
    lengthPreference: settings?.lengthPreference.value ?? "MEDIUM",
    ...(settings?.audience.awarenessLevel
      ? { audienceAwareness: settings.audience.awarenessLevel }
      : {}),
    title: `${subject} · ${request.contentType.replaceAll("_", " ").toLocaleLowerCase()}`,
    ...(settings?.campaignName ? { campaignName: settings.campaignName } : {}),
    provenance: provenance(jobId, request.brandProfileVersionId),
  };
  const sections = [1, 2, 3].map((ordinal) => ({
    id: `section-${ordinal}`,
    ordinal,
    heading:
      ordinal === 1
        ? "The audience need"
        : ordinal === 2
          ? "The practical value"
          : "The next step",
    body:
      ordinal === 1
        ? brand.customerProblem
        : ordinal === 2
          ? brand.valueProposition
          : `${brand.brandPromise} ${cta}.`,
  }));
  let candidate: unknown;
  switch (request.contentType) {
    case "MARKETING_EMAIL":
      candidate = {
        ...common,
        contentType: "MARKETING_EMAIL",
        subjectLine: `${brand.slogan}: ${topic}`,
        previewText: brand.brandPromise,
        greeting: "Hello,",
        opening: `${brand.targetAudienceSummary} deserve a clearer way forward.`,
        bodySections: sections,
        callToAction: {
          label: cta,
          destinationDescription: "Relevant offer page",
        },
        closing: "Thank you for considering the next step.",
        signatureGuidance: `Sign from the ${brand.brandSummary} team.`,
        notes: "Content only — no email was sent.",
      };
      break;
    case "NEWSLETTER":
      candidate = {
        ...common,
        contentType: "NEWSLETTER",
        subjectLine: `${brand.slogan} — project update`,
        previewText: brand.keyMarketingMessages[0],
        editionLabel: "Fictional launch edition",
        introduction: `${topic} is the focus of this structured newsletter draft.`,
        sections: sections.map((section) => ({
          ...section,
          heading: section.heading!,
          summary: section.body,
          callToAction: section.ordinal === 3 ? cta : undefined,
        })),
        closing: `${brand.brandPromise} ${cta}.`,
      };
      break;
    case "PRODUCT_DESCRIPTION":
      candidate = {
        ...common,
        contentType: "PRODUCT_DESCRIPTION",
        productName: subject,
        shortDescription: brand.valueProposition,
        fullDescription: `${brand.brandSummary} ${brand.brandPromise} This draft uses only supplied project context and requires factual review.`,
        keyBenefits: safeList(
          settings?.audience.desiredOutcomes,
          brand.brandPromise,
        ),
        keyFeatures: safeList(
          settings?.mandatoryMessages,
          "Designed around the stated customer need",
        ),
        idealFor: [brand.targetAudienceSummary],
        differentiators: safeList(
          settings?.proofPoints,
          brand.valueProposition,
        ),
        usageGuidance:
          "Confirm product specifications and usage details before use.",
        callToAction: cta,
        seoTitle: `${subject} | ${brand.slogan}`.slice(0, 70),
        metaDescription: brand.valueProposition.slice(0, 180),
      };
      break;
    case "SERVICE_DESCRIPTION":
      candidate = {
        ...common,
        contentType: "SERVICE_DESCRIPTION",
        serviceName: subject,
        shortDescription: brand.valueProposition,
        fullDescription: `${brand.brandSummary} The service description is a draft based on the supplied project context.`,
        clientChallenges: safeList(
          settings?.audience.painPoints,
          brand.customerProblem,
        ),
        approach: [
          "Understand the stated objective",
          "Apply the documented brand direction",
        ],
        deliverables: safeList(
          settings?.mandatoryMessages,
          "Agreed service output",
        ),
        benefits: safeList(
          settings?.audience.desiredOutcomes,
          brand.brandPromise,
        ),
        idealClient: brand.targetAudienceSummary,
        processSummary: "Confirm scope, deliverables and timing before use.",
        callToAction: cta,
      };
      break;
    case "BLOG_OUTLINE":
      candidate = {
        ...common,
        contentType: "BLOG_OUTLINE",
        workingTitle: `${topic}: a practical guide`,
        audienceIntent:
          settings?.audience.summary ?? brand.targetAudienceSummary,
        ...(settings?.seoContext?.primaryKeyword
          ? { primaryKeyword: settings.seoContext.primaryKeyword }
          : {}),
        ...(settings?.seoContext?.secondaryKeywords
          ? { secondaryKeywords: settings.seoContext.secondaryKeywords }
          : {}),
        thesis: brand.valueProposition,
        introductionGuidance: `Frame ${brand.customerProblem} without unsupported statistics.`,
        sections: sections.map((section) => ({
          id: section.id,
          ordinal: section.ordinal,
          heading: section.heading!,
          keyPoints: [
            section.body,
            brand.keyMarketingMessages[
              (section.ordinal - 1) % brand.keyMarketingMessages.length
            ]!,
          ],
          examplesOrEvidence: [
            "Add verified project evidence before publication",
          ],
          transitionGuidance:
            "Connect this point to the next practical outcome.",
        })),
        conclusionGuidance: `${brand.brandPromise} Close with ${cta}.`,
        callToAction: cta,
        estimatedLengthWords:
          settings?.lengthPreference.customWordTarget ??
          (settings?.lengthPreference.value === "LONG" ? 1800 : 900),
      };
      break;
    case "ARTICLE_DRAFT":
      candidate = {
        ...common,
        contentType: "ARTICLE_DRAFT",
        headline: `${topic}: a practical perspective`,
        dek: brand.valueProposition,
        introduction: `${brand.customerProblem} This draft explains the topic using the supplied Brand Profile and avoids unsupported external claims.`,
        sections,
        conclusion: `${brand.brandPromise} ${cta}.`,
        callToAction: cta,
        ...(settings?.seoContext?.primaryKeyword
          ? { primaryKeyword: settings.seoContext.primaryKeyword }
          : {}),
        ...(settings?.seoContext?.secondaryKeywords
          ? { secondaryKeywords: settings.seoContext.secondaryKeywords }
          : {}),
        metaDescription: brand.valueProposition.slice(0, 180),
        factCheckNotes: [
          "Verify all names, dates, claims and figures before publication",
        ],
      };
      break;
    case "PRESS_RELEASE":
      candidate = {
        ...common,
        contentType: "PRESS_RELEASE",
        headline: `${brand.brandSummary} announces ${topic}`,
        subheadline: brand.valueProposition,
        dateline: "[CITY, DATE — VERIFY BEFORE USE]",
        lead: `${brand.brandSummary} announces a fictional development related to ${topic}.`,
        bodySections: sections,
        quotePlaceholders: [
          {
            id: "quote-1",
            speakerRole: "[AUTHORIZED SPOKESPERSON ROLE]",
            quoteDraft: `[DRAFT QUOTE — VERIFY AND APPROVE] ${brand.brandPromise}`,
          },
        ],
        boilerplate: brand.brandSummary,
        mediaContactPlaceholder: "[VERIFIED MEDIA CONTACT]",
        notes: "Review names, dates, quotes and claims before distribution.",
      };
      break;
    case "ANNOUNCEMENT":
      candidate = {
        ...common,
        contentType: "ANNOUNCEMENT",
        audience: settings?.audience.summary ?? brand.targetAudienceSummary,
        headline: `${topic}: announcement`,
        opening: brand.valueProposition,
        details: sections,
        effectiveDateText: "[CONFIRM EFFECTIVE DATE]",
        requiredAction: cta,
        callToAction: cta,
        closing: brand.brandPromise,
      };
      break;
    case "FAQ_DOCUMENT":
      candidate = {
        ...common,
        contentType: "FAQ_DOCUMENT",
        introduction: `Answers based on the current ${brand.brandSummary} project context.`,
        entries: [1, 2, 3].map((ordinal) => ({
          id: `faq-${ordinal}`,
          ordinal,
          question:
            ordinal === 1
              ? `What is ${subject}?`
              : ordinal === 2
                ? "Who is it for?"
                : "What should someone do next?",
          answer:
            ordinal === 1
              ? brand.valueProposition
              : ordinal === 2
                ? brand.targetAudienceSummary
                : cta,
          category: "General",
        })),
        closing: "Confirm policies and operational details before use.",
      };
      break;
    case "CASE_STUDY_OUTLINE":
      candidate = {
        ...common,
        contentType: "CASE_STUDY_OUTLINE",
        clientPlaceholder: "[VERIFIED CLIENT NAME]",
        executiveSummaryGuidance: `Explain ${topic} using approved evidence only.`,
        challenge: {
          summary: brand.customerProblem,
          evidenceNeeded: [
            "Verified starting conditions",
            "Approved client context",
          ],
        },
        approach: {
          summary: brand.valueProposition,
          steps: [
            "Document the approved approach",
            "Validate each claimed action",
          ],
        },
        results: {
          summaryGuidance: "Add only verified outcomes.",
          metricsNeeded: [
            "Approved result metric",
            "Verified measurement period",
          ],
        },
        testimonialPlaceholder: "[APPROVED TESTIMONIAL]",
        lessons: ["Separate confirmed evidence from draft guidance"],
        callToAction: cta,
      };
      break;
    case "PROPOSAL_SUMMARY":
      candidate = {
        ...common,
        contentType: "PROPOSAL_SUMMARY",
        clientContext:
          settings?.audience.summary ?? brand.targetAudienceSummary,
        objectives: [topic],
        proposedApproach: ["Confirm requirements", "Deliver the agreed scope"],
        deliverables: safeList(
          settings?.mandatoryMessages,
          "Defined copy deliverable",
        ),
        assumptions: ["All supplied facts are accurate and approved"],
        exclusions: ["Binding legal terms", "Unapproved third-party services"],
        timelineGuidance: "[CONFIRM TIMELINE]",
        investmentGuidance: "[CONFIRM COMMERCIAL TERMS]",
        successCriteria: safeList(
          settings?.audience.desiredOutcomes,
          brand.brandPromise,
        ),
        nextSteps: [cta],
        notes:
          "Draft summary only — review commercial and legal terms before use.",
      };
      break;
    case "SALES_ONE_PAGER":
      candidate = {
        ...common,
        contentType: "SALES_ONE_PAGER",
        headline: brand.slogan,
        subheadline: brand.valueProposition,
        problem: brand.customerProblem,
        solution: brand.brandPromise,
        benefits: safeList(
          settings?.audience.desiredOutcomes,
          brand.brandPromise,
        ),
        differentiators: safeList(
          settings?.proofPoints,
          brand.valueProposition,
        ),
        howItWorks: ["Understand the need", "Apply the proposed solution"],
        idealFor: [brand.targetAudienceSummary],
        callToAction: cta,
      };
      break;
    case "COMPANY_BIO":
      candidate = {
        ...common,
        contentType: "COMPANY_BIO",
        shortBio: brand.brandSummary,
        mediumBio: `${brand.brandSummary} ${brand.positioning} ${brand.brandPromise}`,
        longBio: `${brand.brandSummary} ${brand.positioning} ${brand.valueProposition} ${brand.mission} ${brand.vision}`,
        keyFacts: [brand.valueProposition],
        positioningStatement: brand.positioning,
      };
      break;
    case "EXECUTIVE_BIO":
      candidate = {
        ...common,
        contentType: "EXECUTIVE_BIO",
        personNamePlaceholder: "[VERIFIED PERSON NAME]",
        rolePlaceholder: "[VERIFIED ROLE]",
        shortBio: `[VERIFIED PERSON NAME] supports ${brand.mission.toLocaleLowerCase()}.`,
        longBio: `[VERIFIED PERSON NAME] is the [VERIFIED ROLE] associated with ${brand.brandSummary} Add only verified experience, education and achievements.`,
        expertiseAreas: ["[VERIFIED EXPERTISE AREA]"],
        achievementPlaceholders: ["[VERIFIED ACHIEVEMENT]"],
      };
      break;
    case "COPY_BLOCK":
      candidate = {
        ...common,
        contentType: "COPY_BLOCK",
        blockType: "VALUE_PROPOSITION",
        text: brand.valueProposition,
        alternatives: brand.keyMarketingMessages
          .slice(0, 3)
          .map((value, index) => ({
            id: `alternative-${index + 1}`,
            label: `Alternative ${index + 1}`,
            text: value,
          })),
        usageGuidance: "Use where a concise brand value statement is needed.",
      };
      break;
  }
  if (
    request.scenario === "invalid-email-sections" &&
    request.contentType === "MARKETING_EMAIL"
  )
    (candidate as { bodySections: unknown[] }).bodySections = [];
  if (
    request.scenario === "invalid-article-length" &&
    request.contentType === "ARTICLE_DRAFT"
  )
    (candidate as { introduction: string }).introduction = "x".repeat(40_001);
  if (
    request.scenario === "duplicate-faq-id" &&
    request.contentType === "FAQ_DOCUMENT"
  ) {
    const entries = (candidate as { entries: Array<{ id: string }> }).entries;
    entries[1]!.id = entries[0]!.id;
  }
  if (
    request.scenario === "invalid-press-release" &&
    request.contentType === "PRESS_RELEASE"
  )
    (candidate as { boilerplate: string }).boilerplate = "";
  return GeneralCopySnapshotSchema.parse(candidate);
}

function scenarioFor(
  scenario: string,
  type: GeneralCopyType,
  index: number,
  count: number,
) {
  if (scenario === "one-item-failure" && index === count - 1) return "failure";
  if (scenario === "invalid-email-sections" && type === "MARKETING_EMAIL")
    return scenario;
  if (scenario === "invalid-article-length" && type === "ARTICLE_DRAFT")
    return scenario;
  if (scenario === "duplicate-faq-id" && type === "FAQ_DOCUMENT")
    return scenario;
  if (scenario === "invalid-press-release" && type === "PRESS_RELEASE")
    return scenario;
  if (
    scenario === "timeout-product-description" &&
    type === "PRODUCT_DESCRIPTION"
  )
    return "timeout";
  if (scenario === "unsupported-fact-claim" && index === count - 1)
    return "UNSUPPORTED_FACT_CLAIM";
  return "success";
}

async function aggregate(prisma: PrismaClient, parentJobId: string) {
  const children = await prisma.generationJob.findMany({
    where: { parentJobId },
    select: { status: true },
  });
  if (
    !children.length ||
    !children.every(({ status }) =>
      ["COMPLETED", "FAILED", "CANCELLED"].includes(status),
    )
  )
    return;
  const completed = children.filter(
    ({ status }) => status === "COMPLETED",
  ).length;
  const status =
    completed === children.length
      ? "COMPLETED"
      : completed
        ? "PARTIAL"
        : "FAILED";
  const parent = await prisma.generationJob.update({
    where: { id: parentJobId },
    data: {
      status,
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "COPY_ASSET_FAILED",
    },
  });
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId: parentJobId, key: "assets" } },
    data: {
      status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "COPY_ASSET_FAILED",
    },
  });
  await prisma.projectModule.updateMany({
    where: { projectId: parent.projectId, module: "COPY" },
    data: {
      status:
        status === "COMPLETED"
          ? "COMPLETE"
          : status === "PARTIAL"
            ? "PARTIAL"
            : "FAILED",
    },
  });
}
async function fail(
  prisma: PrismaClient,
  job: Job,
  code: string,
  parentJobId?: string | null,
) {
  await prisma.generationJobStep.updateMany({
    where: { jobId: job.id, status: "RUNNING" },
    data: { status: "FAILED", completedAt: new Date(), safeErrorCode: code },
  });
  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
      safeErrorCode: code,
      safeErrorDetails: { currentContentUnchanged: true },
    },
  });
  if (parentJobId) await aggregate(prisma, parentJobId);
}

type OrderedCopySection = {
  id: string;
  ordinal: number;
  heading?: string | undefined;
  body?: string | undefined;
  question?: string | undefined;
  answer?: string | undefined;
  keyPoints?: string[] | undefined;
};
function sectionCollection(
  snapshot: GeneralCopySnapshot,
): OrderedCopySection[] {
  switch (snapshot.contentType) {
    case "MARKETING_EMAIL":
    case "PRESS_RELEASE":
      return snapshot.bodySections;
    case "NEWSLETTER":
    case "BLOG_OUTLINE":
    case "ARTICLE_DRAFT":
      return snapshot.sections;
    case "ANNOUNCEMENT":
      return snapshot.details;
    case "FAQ_DOCUMENT":
      return snapshot.entries;
    default:
      throw new Error("INVALID_TARGET");
  }
}
function replaceSections(
  snapshot: GeneralCopySnapshot,
  sections: OrderedCopySection[],
  provenanceValue: GeneralCopySnapshot["provenance"],
): GeneralCopySnapshot {
  const update = { ...snapshot, provenance: provenanceValue };
  switch (snapshot.contentType) {
    case "MARKETING_EMAIL":
    case "PRESS_RELEASE":
      return GeneralCopySnapshotSchema.parse({
        ...update,
        bodySections: sections,
      });
    case "NEWSLETTER":
    case "BLOG_OUTLINE":
    case "ARTICLE_DRAFT":
      return GeneralCopySnapshotSchema.parse({ ...update, sections });
    case "ANNOUNCEMENT":
      return GeneralCopySnapshotSchema.parse({ ...update, details: sections });
    case "FAQ_DOCUMENT":
      return GeneralCopySnapshotSchema.parse({ ...update, entries: sections });
    default:
      throw new Error("INVALID_TARGET");
  }
}
function replaceTarget(
  current: GeneralCopySnapshot,
  generated: GeneralCopySnapshot,
  target: CopyRegenerationTarget,
): GeneralCopySnapshot {
  if (current.contentType !== generated.contentType)
    throw new Error("INVALID_TARGET");
  if (target.kind === "SECTION") {
    const currentSections = sectionCollection(current);
    const replacement = sectionCollection(generated)[0];
    if (
      !replacement ||
      !currentSections.some(({ id }) => id === target.sectionId)
    )
      throw new Error("INVALID_TARGET");
    return replaceSections(
      current,
      currentSections.map((section) =>
        section.id === target.sectionId
          ? { ...replacement, id: section.id, ordinal: section.ordinal }
          : section,
      ),
      generated.provenance,
    );
  }
  const field = target.field;
  const next = { ...current, provenance: generated.provenance };
  switch (current.contentType) {
    case "MARKETING_EMAIL": {
      if (generated.contentType !== "MARKETING_EMAIL") break;
      if (field === "SUBJECT_LINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          subjectLine: generated.subjectLine,
        });
      if (field === "PREVIEW_TEXT")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          previewText: generated.previewText,
        });
      if (field === "OPENING")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          opening: generated.opening,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      break;
    }
    case "NEWSLETTER": {
      if (generated.contentType !== "NEWSLETTER") break;
      if (field === "SUBJECT_LINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          subjectLine: generated.subjectLine,
        });
      if (field === "PREVIEW_TEXT")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          previewText: generated.previewText,
        });
      if (field === "INTRODUCTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          introduction: generated.introduction,
        });
      if (field === "CONCLUSION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          closing: generated.closing,
        });
      break;
    }
    case "PRODUCT_DESCRIPTION": {
      if (generated.contentType !== "PRODUCT_DESCRIPTION") break;
      if (field === "SHORT_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          shortDescription: generated.shortDescription,
        });
      if (field === "FULL_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          fullDescription: generated.fullDescription,
        });
      if (field === "KEY_BENEFITS")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          keyBenefits: generated.keyBenefits,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      if (field === "META_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          metaDescription: generated.metaDescription,
        });
      break;
    }
    case "SERVICE_DESCRIPTION": {
      if (generated.contentType !== "SERVICE_DESCRIPTION") break;
      if (field === "SHORT_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          shortDescription: generated.shortDescription,
        });
      if (field === "FULL_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          fullDescription: generated.fullDescription,
        });
      if (field === "KEY_BENEFITS")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          benefits: generated.benefits,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      break;
    }
    case "BLOG_OUTLINE": {
      if (generated.contentType !== "BLOG_OUTLINE") break;
      if (field === "HEADLINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          workingTitle: generated.workingTitle,
        });
      if (field === "INTRODUCTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          introductionGuidance: generated.introductionGuidance,
        });
      if (field === "CONCLUSION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          conclusionGuidance: generated.conclusionGuidance,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      break;
    }
    case "ARTICLE_DRAFT": {
      if (generated.contentType !== "ARTICLE_DRAFT") break;
      if (field === "HEADLINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          headline: generated.headline,
        });
      if (field === "INTRODUCTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          introduction: generated.introduction,
        });
      if (field === "CONCLUSION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          conclusion: generated.conclusion,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      if (field === "META_DESCRIPTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          metaDescription: generated.metaDescription,
        });
      break;
    }
    case "PRESS_RELEASE": {
      if (generated.contentType !== "PRESS_RELEASE") break;
      if (field === "HEADLINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          headline: generated.headline,
        });
      if (field === "INTRODUCTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          lead: generated.lead,
        });
      if (field === "BOILERPLATE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          boilerplate: generated.boilerplate,
        });
      break;
    }
    case "ANNOUNCEMENT": {
      if (generated.contentType !== "ANNOUNCEMENT") break;
      if (field === "HEADLINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          headline: generated.headline,
        });
      if (field === "OPENING")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          opening: generated.opening,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      if (field === "CONCLUSION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          closing: generated.closing,
        });
      break;
    }
    case "FAQ_DOCUMENT": {
      if (generated.contentType !== "FAQ_DOCUMENT") break;
      if (field === "INTRODUCTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          introduction: generated.introduction,
        });
      if (field === "CONCLUSION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          closing: generated.closing,
        });
      if (field === "FAQ_ANSWER" && target.sectionId) {
        const answer = generated.entries[0]?.answer;
        if (
          !answer ||
          !current.entries.some(({ id }) => id === target.sectionId)
        )
          break;
        return GeneralCopySnapshotSchema.parse({
          ...next,
          entries: current.entries.map((entry) =>
            entry.id === target.sectionId ? { ...entry, answer } : entry,
          ),
        });
      }
      break;
    }
    case "SALES_ONE_PAGER": {
      if (generated.contentType !== "SALES_ONE_PAGER") break;
      if (field === "HEADLINE")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          headline: generated.headline,
        });
      if (field === "VALUE_PROPOSITION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          solution: generated.solution,
        });
      if (field === "KEY_BENEFITS")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          benefits: generated.benefits,
        });
      if (field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          callToAction: generated.callToAction,
        });
      break;
    }
    case "COMPANY_BIO": {
      if (generated.contentType !== "COMPANY_BIO") break;
      if (field === "BIO_SHORT")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          shortBio: generated.shortBio,
        });
      if (field === "BIO_LONG")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          longBio: generated.longBio,
        });
      if (field === "VALUE_PROPOSITION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          positioningStatement: generated.positioningStatement,
        });
      break;
    }
    case "EXECUTIVE_BIO": {
      if (generated.contentType !== "EXECUTIVE_BIO") break;
      if (field === "BIO_SHORT")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          shortBio: generated.shortBio,
        });
      if (field === "BIO_LONG")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          longBio: generated.longBio,
        });
      break;
    }
    case "COPY_BLOCK": {
      if (generated.contentType !== "COPY_BLOCK") break;
      if (field === "VALUE_PROPOSITION" || field === "CALL_TO_ACTION")
        return GeneralCopySnapshotSchema.parse({
          ...next,
          text: generated.text,
        });
      break;
    }
    case "CASE_STUDY_OUTLINE": {
      if (
        generated.contentType === "CASE_STUDY_OUTLINE" &&
        field === "INTRODUCTION"
      )
        return GeneralCopySnapshotSchema.parse({
          ...next,
          executiveSummaryGuidance: generated.executiveSummaryGuidance,
        });
      break;
    }
    case "PROPOSAL_SUMMARY": {
      if (
        generated.contentType === "PROPOSAL_SUMMARY" &&
        field === "INTRODUCTION"
      )
        return GeneralCopySnapshotSchema.parse({
          ...next,
          clientContext: generated.clientContext,
        });
      break;
    }
  }
  throw new Error("INVALID_TARGET");
}

export async function handleCopyJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "COPY_MODULE") {
    try {
      const request = job.request as {
        kind: "COPY_MODULE";
        batchKey: string;
        brandProfileVersionId: string;
        settings: unknown;
      };
      const settings = CopyGenerationRequestSchema.parse(request.settings);
      const planned = Array.from({ length: settings.quantity }, (_, index) => ({
        contentType: settings.copyTypes[index % settings.copyTypes.length]!,
        ordinal: index + 1,
      }));
      await prisma.$transaction(async (tx) => {
        for (const [index, plan] of planned.entries()) {
          const itemKey = `${request.batchKey}-${plan.contentType.toLocaleLowerCase()}-${String(plan.ordinal).padStart(2, "0")}`;
          const idempotencyKey = `${job.id}:${itemKey}`;
          await tx.generationJob.upsert({
            where: {
              projectId_idempotencyKey: {
                projectId: job.projectId,
                idempotencyKey,
              },
            },
            update: {},
            create: {
              projectId: job.projectId,
              parentJobId: job.id,
              scopeType: "CONTENT_ITEM",
              scopeId: itemKey,
              module: "COPY",
              status: "QUEUED",
              mode: stored?.mode ?? "MOCK",
              provider: stored?.mode === "REAL" ? "OPENAI" : "MOCK",
              briefRevision: stored?.briefRevision ?? null,
              promptKey: `copy.${plan.contentType.toLocaleLowerCase()}.generation`,
              promptVersion: "1.0.0",
              generationPurpose: "ITEM_GENERATION",
              idempotencyKey,
              request: {
                kind: "COPY_ITEM_NEW",
                itemKey,
                contentType: plan.contentType,
                ordinal: plan.ordinal,
                settings,
                brandProfileVersionId: request.brandProfileVersionId,
                scenario: scenarioFor(
                  settings.mockScenario,
                  plan.contentType,
                  index,
                  planned.length,
                ),
              } as Prisma.InputJsonValue,
              steps: {
                create: [
                  ["prepare", "Preparing project context"],
                  ["generate", "Writing structured copy"],
                  ["validate", "Validating copy"],
                  ["save", "Saving copy asset"],
                ].map(([key, label], ordinal) => ({
                  key: key!,
                  label: label!,
                  ordinal,
                })),
              },
            },
          });
        }
        for (const key of ["prepare", "plan"])
          await tx.generationJobStep.update({
            where: { jobId_key: { jobId: job.id, key } },
            data: {
              status: "COMPLETED",
              startedAt: new Date(),
              completedAt: new Date(),
            },
          });
        await tx.generationJobStep.update({
          where: { jobId_key: { jobId: job.id, key: "assets" } },
          data: { status: "RUNNING", startedAt: new Date() },
        });
        await tx.generationJob.update({
          where: { id: job.id },
          data: { status: "RUNNING", leaseToken: null, leaseExpiresAt: null },
        });
      });
    } catch {
      await fail(prisma, job, "INVALID_REQUEST");
    }
    return;
  }
  const request = job.request as CopyItemRequest;
  try {
    if (
      request.scenario === "failure" ||
      request.scenario === "timeout" ||
      request.scenario === "UNSUPPORTED_FACT_CLAIM"
    )
      throw new Error(
        request.scenario === "timeout"
          ? "PROVIDER_TIMEOUT"
          : request.scenario === "UNSUPPORTED_FACT_CLAIM"
            ? "UNSUPPORTED_FACT_CLAIM"
            : "PROVIDER_FAILURE",
      );
    const profile = await prisma.brandProfileVersion.findFirst({
      where: {
        id: request.brandProfileVersionId,
        brandProfile: { projectId: job.projectId },
      },
    });
    if (!profile) throw new Error("PROFILE_NOT_FOUND");
    const brand = BrandProfileSchema.parse(profile.snapshot);
    if (request.kind === "COPY_ITEM_NEW") {
      if (!request.itemKey || !request.settings)
        throw new Error("INVALID_REQUEST");
      const snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: createDeterministicCopySnapshot(request, brand, job.id),
          schema: getGeneralCopySchema(request.contentType),
          context: { request, brandProfile: brand },
          promptKey: `copy.${request.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose: "ITEM_GENERATION",
        })
      ).snapshot;
      const existing = await prisma.contentItem.findFirst({
        where: {
          projectId: job.projectId,
          module: "COPY",
          identityKey: request.itemKey,
        },
      });
      if (!existing)
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "COPY",
              type: request.contentType,
              identityKey: request.itemKey!,
              title: snapshot.title,
              sourceJobId: job.id,
              sourceBrandProfileVersionId: request.brandProfileVersionId,
            },
          });
          const version = await tx.contentItemVersion.create({
            data: {
              contentItemId: item.id,
              versionNumber: 1,
              schemaVersion: "1.0",
              snapshot: snapshot as unknown as Prisma.InputJsonValue,
              source: "GENERATED",
              sourceJobId: job.id,
              brandProfileVersionId: request.brandProfileVersionId,
              mock: snapshot.provenance.mock,
              provenance:
                snapshot.provenance as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.contentItem.update({
            where: { id: item.id },
            data: { currentVersionId: version.id },
          });
        });
    } else {
      if (!request.itemId || !request.expectedCurrentVersionId)
        throw new Error("INVALID_REQUEST");
      const item = await prisma.contentItem.findFirst({
        where: {
          id: request.itemId,
          projectId: job.projectId,
          module: "COPY",
        },
        include: { currentVersion: true },
      });
      if (!item?.currentVersion) throw new Error("ITEM_NOT_FOUND");
      const current = getGeneralCopySchema(request.contentType).parse(
        item.currentVersion.snapshot,
      );
      let snapshot = createDeterministicCopySnapshot(
        {
          ...request,
          settings: {
            schemaVersion: "1.0",
            copyTypes: [request.contentType],
            quantity: 1,
            purpose: current.purpose,
            topic: current.title,
            audience: { summary: brand.targetAudienceSummary },
            toneOverride: "BRAND_DEFAULT",
            lengthPreference: { value: "MEDIUM" },
            outputLanguage: "English",
            mockScenario: "success",
          },
        },
        brand,
        job.id,
      );
      if (request.target)
        snapshot = replaceTarget(current, snapshot, request.target);
      snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: snapshot,
          schema: getGeneralCopySchema(request.contentType),
          context: { request, brandProfile: brand, currentSnapshot: current },
          promptKey: `copy.${request.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose:
            request.target?.kind === "SECTION"
              ? "SECTION_REGENERATION"
              : request.target?.kind === "FIELD"
                ? "FIELD_REGENERATION"
                : "WHOLE_ITEM_REGENERATION",
        })
      ).snapshot;
      const valid = getGeneralCopySchema(request.contentType).parse(snapshot);
      const { createContentVersion } =
        await import("@/server/services/content-version-service");
      const result = await createContentVersion(prisma, {
        itemId: item.id,
        expectedCurrentVersionId: request.expectedCurrentVersionId,
        snapshot: valid,
        source: "REGENERATED",
        brandProfileVersionId: request.brandProfileVersionId,
        provenance: valid.provenance,
        sourceJobId: job.id,
        mock: valid.provenance.mock,
      });
      if (!result.ok) throw new Error(result.error.code);
    }
    await prisma.generationJobStep.updateMany({
      where: { jobId: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    if (stored?.parentJobId) await aggregate(prisma, stored.parentJobId);
  } catch (error: unknown) {
    await fail(
      prisma,
      job,
      error instanceof Error ? error.message : "INVALID_OUTPUT",
      stored?.parentJobId,
    );
  }
}
