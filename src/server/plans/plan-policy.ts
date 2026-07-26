import type { PlanId } from "@/generated/prisma/client";

export type PlanPolicy = Readonly<{
  id: PlanId;
  label: string;
  projectLimit: number;
  monthlyRealTokens: number;
  concurrentJobs: number;
  exportMaxBytes: number;
  exportRetentionHours: number;
  formats: readonly ("PLAIN_TEXT" | "MARKDOWN" | "JSON" | "CSV")[];
}>;

const policies: Record<PlanId, PlanPolicy> = {
  FREE: {
    id: "FREE",
    label: "Launch access",
    projectLimit: 3,
    monthlyRealTokens: 250_000,
    concurrentJobs: 1,
    exportMaxBytes: 1_000_000,
    exportRetentionHours: 24,
    formats: ["PLAIN_TEXT", "MARKDOWN", "JSON", "CSV"],
  },
  INTERNAL: {
    id: "INTERNAL",
    label: "Internal",
    projectLimit: 100,
    monthlyRealTokens: 10_000_000,
    concurrentJobs: 4,
    exportMaxBytes: 10_000_000,
    exportRetentionHours: 72,
    formats: ["PLAIN_TEXT", "MARKDOWN", "JSON", "CSV"],
  },
};

export function resolvePlanPolicy(value: string): PlanPolicy | null {
  return value === "FREE" || value === "INTERNAL" ? policies[value] : null;
}
