"use server";

import { z } from "zod";

import { getPrisma } from "@/server/db/prisma";
import {
  enforceRateLimit,
  RateLimitError,
  requestSubject,
} from "@/server/security/rate-limit";

const betaInterestSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid work email.")
      .max(254),
    companyOrProject: z
      .string()
      .trim()
      .min(2, "Enter a company or project.")
      .max(160),
    role: z.enum(["FOUNDER", "MARKETING", "AGENCY", "CONSULTANT", "OTHER"]),
    primaryChallenge: z
      .string()
      .trim()
      .min(10, "Add a little more detail.")
      .max(1_000),
    currentTools: z.string().trim().max(500).optional(),
    expectedMonthlyUsage: z.enum([
      "UNDER_20",
      "20_100",
      "101_500",
      "OVER_500",
      "UNSURE",
    ]),
    consent: z.literal("on", { error: "Consent is required." }),
    website: z.string().max(0),
  })
  .strict();

export type BetaInterestState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function submitBetaInterest(
  _previous: BetaInterestState,
  formData: FormData,
): Promise<BetaInterestState> {
  const parsed = betaInterestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    companyOrProject: formData.get("companyOrProject"),
    role: formData.get("role"),
    primaryChallenge: formData.get("primaryChallenge"),
    currentTools: formData.get("currentTools") || undefined,
    expectedMonthlyUsage: formData.get("expectedMonthlyUsage"),
    consent: formData.get("consent"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };

  try {
    await enforceRateLimit({
      action: "beta-interest",
      subjectHash: await requestSubject(parsed.data.email),
      limit: 5,
      windowSeconds: 60 * 60,
    });
    await getPrisma().betaInterest.upsert({
      where: { email: parsed.data.email },
      create: {
        name: parsed.data.name,
        email: parsed.data.email,
        companyOrProject: parsed.data.companyOrProject,
        role: parsed.data.role,
        primaryChallenge: parsed.data.primaryChallenge,
        currentTools: parsed.data.currentTools ?? null,
        expectedMonthlyUsage: parsed.data.expectedMonthlyUsage,
        consentedAt: new Date(),
      },
      update: {
        name: parsed.data.name,
        companyOrProject: parsed.data.companyOrProject,
        role: parsed.data.role,
        primaryChallenge: parsed.data.primaryChallenge,
        currentTools: parsed.data.currentTools ?? null,
        expectedMonthlyUsage: parsed.data.expectedMonthlyUsage,
        consentedAt: new Date(),
      },
    });
    return {
      status: "success",
      message:
        "Your interest has been recorded. We will contact you if the private beta is a suitable fit.",
    };
  } catch (error: unknown) {
    if (error instanceof RateLimitError)
      return {
        status: "error",
        message: "Too many requests were received. Please try again later.",
      };
    return {
      status: "error",
      message:
        "Your request could not be recorded. Your information was not submitted; please try again.",
    };
  }
}
