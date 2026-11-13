import { z } from "zod";

import type { PromptDefinition } from "@/ai/prompts/registry";

// ADR-071 / ADR-073: each generation task resolves to a versioned policy. The
// "default" policy reproduces the behaviour before the gateway existed: the
// OpenAI runtime at the prompt's tier, structured output, no external
// fallback.

export const privacyLevels = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
export type PrivacyLevel = (typeof privacyLevels)[number];

export const TaskPolicySchema = z
  .object({
    taskKey: z.string().min(1),
    policyKey: z.string().min(1),
    policyVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    privacy: z.enum(privacyLevels),
    requiredCapabilities: z.array(z.enum(["structured"])),
    // Runtimes tried in order for real generation.
    preferredRuntimes: z.array(z.string().min(1)).min(1),
    externalFallback: z
      .object({
        allowed: z.boolean(),
        runtimes: z.array(z.string().min(1)),
      })
      .strict(),
    repair: z.enum(["NONE", "STRUCTURE_ONCE"]),
  })
  .strict();

export type TaskPolicy = z.infer<typeof TaskPolicySchema>;

export const DEFAULT_POLICY_KEY = "default";
export const DEFAULT_POLICY_VERSION = "1.0.0";

export function resolveTaskPolicy(
  prompt: Pick<PromptDefinition<unknown, unknown>, "key" | "repairPolicy">,
): TaskPolicy {
  return TaskPolicySchema.parse({
    taskKey: prompt.key,
    policyKey: DEFAULT_POLICY_KEY,
    policyVersion: DEFAULT_POLICY_VERSION,
    privacy: "internal",
    requiredCapabilities: ["structured"],
    preferredRuntimes: ["openai"],
    externalFallback: { allowed: false, runtimes: [] },
    repair: prompt.repairPolicy,
  });
}

const privacyRank: Record<PrivacyLevel, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export function mostRestrictivePrivacy(
  ...levels: readonly PrivacyLevel[]
): PrivacyLevel {
  return levels.reduce((current, level) =>
    privacyRank[level] > privacyRank[current] ? level : current,
  );
}
