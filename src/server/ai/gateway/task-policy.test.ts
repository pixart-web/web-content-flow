import { describe, expect, it } from "vitest";

import { loadPromptCatalog } from "@/ai/prompts/registry";

import {
  DEFAULT_POLICY_VERSION,
  mostRestrictivePrivacy,
  resolveTaskPolicy,
} from "./task-policy";

describe("task policies", () => {
  it("resolves a valid, deterministic default policy for every prompt", async () => {
    const prompts = await loadPromptCatalog();
    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      const policy = resolveTaskPolicy(prompt);
      expect(policy).toEqual(resolveTaskPolicy(prompt));
      expect(policy).toMatchObject({
        taskKey: prompt.key,
        policyKey: "default",
        policyVersion: DEFAULT_POLICY_VERSION,
        preferredRuntimes: ["openai"],
        externalFallback: { allowed: false, runtimes: [] },
        repair: prompt.repairPolicy,
      });
    }
  });

  it("combines privacy levels by taking the most restrictive", () => {
    expect(mostRestrictivePrivacy("internal", "restricted")).toBe("restricted");
    expect(mostRestrictivePrivacy("public", "internal")).toBe("internal");
  });
});
