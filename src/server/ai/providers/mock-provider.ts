import "server-only";

import { createHash } from "node:crypto";
import type { z } from "zod";

import type { ProjectBrief } from "@/domain/brief/brief-schema";
import type { BrandProfile } from "@/domain/brand-profile/brand-profile-schema";

import type {
  AiGenerationResult,
  AiProvider,
  StructuredGenerationRequest,
} from "../ai-provider";
import { ProviderError } from "../ai-provider";

function stableColor(value: string): string {
  return `#${createHash("sha256").update(value).digest("hex").slice(0, 6).toUpperCase()}`;
}

function buildProfile(
  brief: ProjectBrief,
  request: StructuredGenerationRequest<ProjectBrief>,
): BrandProfile {
  const brand = brief.project.brandName;
  const audience = brief.audience.targetAudience;
  const generatedAt = new Date(0).toISOString();
  return {
    schemaVersion: "1.0",
    brandSummary: `${brand} provides ${brief.project.productOrService} for ${audience}.`,
    positioning: `${brand} is positioned as a clear, practical choice for ${audience}, focused on ${brief.objective.primaryObjective.toLowerCase()}.`,
    valueProposition: brief.audience.valueProposition,
    mission: `Help ${audience} solve ${brief.audience.customerProblem.toLowerCase()} through ${brief.project.productOrService}.`,
    vision: `Become a trusted reference for ${audience} in ${brief.project.projectType.toLowerCase()}.`,
    values: ["Clarity", "Consistency", "Practical value"],
    targetAudienceSummary: `${audience}${brief.audience.location ? ` in ${brief.audience.location}` : ""}.`,
    customerProblem: brief.audience.customerProblem,
    brandPromise: `${brand} will make ${brief.objective.desiredCustomerAction.toLowerCase()} clearer and easier.`,
    slogan: `${brand}. Clear direction, useful action.`,
    personality: ["Confident", "Helpful", "Organized"],
    toneOfVoice: [brief.direction.toneOfVoice, "Direct", "Practical"],
    writingGuidelines: [
      "Lead with the customer outcome.",
      "Use concrete language.",
      "Keep calls to action specific.",
    ],
    wordsToUse: [...brief.direction.keywords.slice(0, 8), "clear", "trusted"],
    wordsToAvoid: ["magic", "revolutionary", "guaranteed"],
    visualDirection:
      brief.direction.visualStyle ||
      `Clean, structured visuals that make ${brand} feel credible and approachable.`,
    colorPalette: [
      {
        name: "Primary",
        hex: stableColor(brand),
        role: "Primary brand accent",
      },
      { name: "Foundation", hex: "#0F172A", role: "Primary text and contrast" },
      { name: "Canvas", hex: "#F8FAFC", role: "Light background" },
    ],
    typographyRecommendations: [
      "A confident geometric sans-serif for headings",
      "A highly readable sans-serif for body copy",
    ],
    imageDirection: `Show realistic situations involving ${audience}; use organized compositions and natural detail.`,
    reusableImagePrompt: `Create a premium, realistic brand image for ${brand}, showing ${audience}, with ${brief.direction.visualStyle || "clean and structured"} art direction. Avoid text, logos, and generic AI imagery.`,
    keyMarketingMessages: [
      brief.audience.valueProposition,
      brief.objective.primaryOffer,
      `Designed for ${audience}.`,
    ],
    primaryCallsToAction: [
      brief.objective.desiredCustomerAction,
      "Learn more",
      "Get started",
    ],
    provenance: {
      provider: "mock",
      model: request.model,
      promptVersion: request.promptVersion,
      schemaVersion: request.schemaVersion,
      requestId: request.requestId,
      generationJobId: null,
      generatedAt,
      mock: true,
      briefRevision: 1,
    },
  };
}

export class MockProvider implements AiProvider {
  readonly name = "MOCK" as const;

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>> {
    if (request.signal?.aborted) {
      throw new ProviderError("CANCELLED", false, "Generation was cancelled.");
    }
    if (request.scenario === "provider-failure") {
      throw new ProviderError(
        "PROVIDER_UNAVAILABLE",
        true,
        "The mock provider was configured to fail.",
      );
    }
    if (request.scenario === "timeout") {
      throw new ProviderError("TIMEOUT", true, "Mock generation timed out.");
    }
    if (request.scenario === "rate-limit") {
      throw new ProviderError(
        "RATE_LIMITED",
        true,
        "The mock provider was configured to rate limit.",
      );
    }
    if (request.scenario === "refusal") {
      throw new ProviderError(
        "CONTENT_REFUSED",
        false,
        "The mock provider was configured to refuse.",
      );
    }

    const candidate =
      request.scenario === "invalid-output"
        ? { schemaVersion: "invalid" }
        : buildProfile(
            request.input as ProjectBrief,
            request as StructuredGenerationRequest<ProjectBrief>,
          );
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      throw new ProviderError(
        "SCHEMA_VALIDATION_FAILED",
        false,
        "Generated output did not match the required schema.",
      );
    }

    return {
      data: parsed.data,
      provider: "MOCK",
      model: request.model,
      modelTier: request.modelTier ?? "STANDARD",
      mock: true,
      finishState: "COMPLETED",
      usage: {
        inputTokens: Math.ceil(JSON.stringify(request.input).length / 4),
        outputTokens: Math.ceil(JSON.stringify(parsed.data).length / 4),
        usageSource: "ESTIMATED",
      },
    };
  }
}
