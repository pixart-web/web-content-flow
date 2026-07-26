import { describe, expect, it } from "vitest";

import { loadPromptCatalog } from "./registry";

describe("prompt registry", () => {
  it("uses immutable identities and bounded policies", async () => {
    const prompts = await loadPromptCatalog();
    const identities = prompts.map(
      (prompt) => `${prompt.key}@${prompt.version}`,
    );

    expect(prompts.length).toBeGreaterThanOrEqual(7);
    expect(new Set(identities).size).toBe(identities.length);
    expect(prompts.every((prompt) => prompt.version === "1.0.0")).toBe(true);
    expect(
      prompts.every(
        (prompt) =>
          prompt.repairPolicy === "STRUCTURE_ONCE" &&
          prompt.maximumInputTokens > 0 &&
          prompt.maximumOutputTokens > 0,
      ),
    ).toBe(true);
  });
});
