import { describe, expect, it } from "vitest";

import {
  claimRevisionAfterEdit,
  unsupportedClaimHits,
} from "./unsupported-claims";

describe("claimRevisionAfterEdit", () => {
  it("keeps only the remaining marks whose words are still in the text", () => {
    const review = {
      flagged: ["respiráveis", "garantia", "Mais vendidas"],
      remaining: ["garantia", "Mais vendidas"],
    };
    const edited = {
      body: "Sapatilhas mais vendidas da estação.",
      provenance: { claimRevision: review, note: "garantia" },
    };
    expect(claimRevisionAfterEdit(review, edited)).toEqual({
      flagged: ["respiráveis", "garantia", "Mais vendidas"],
      remaining: ["Mais vendidas"],
    });
  });

  it("ignores identifiers when looking for claims", () => {
    expect(
      unsupportedClaimHits(
        {
          entries: [
            { id: "urbanstride-materials-eco", answer: "Cork insole." },
          ],
        },
        {},
      ),
    ).toEqual([]);
  });
});
