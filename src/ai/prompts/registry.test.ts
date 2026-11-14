import { describe, expect, it } from "vitest";

import { BRAND_AUTHORITY_INSTRUCTIONS } from "./shared/instructions";
import { CURRENT_PROMPT_VERSION, loadPromptCatalog } from "./registry";

describe("prompt registry", () => {
  it("uses immutable identities and bounded policies", async () => {
    const prompts = await loadPromptCatalog();
    const identities = prompts.map(
      (prompt) => `${prompt.key}@${prompt.version}`,
    );

    expect(prompts.length).toBeGreaterThanOrEqual(7);
    expect(new Set(identities).size).toBe(identities.length);
    expect(
      prompts.every((prompt) => prompt.version === CURRENT_PROMPT_VERSION),
    ).toBe(true);
    expect(
      prompts.every(
        (prompt) =>
          prompt.repairPolicy === "STRUCTURE_ONCE" &&
          prompt.maximumInputTokens > 0 &&
          prompt.maximumOutputTokens > 0,
      ),
    ).toBe(true);
  });

  it("forbids invented URLs, contacts and product attributes (1.1.0)", () => {
    expect(CURRENT_PROMPT_VERSION).toBe("1.1.0");
    expect(BRAND_AUTHORITY_INSTRUCTIONS).toContain("Do not invent URLs");
    expect(BRAND_AUTHORITY_INSTRUCTIONS).toContain(
      "Do not attribute materials, technologies",
    );
  });
});
