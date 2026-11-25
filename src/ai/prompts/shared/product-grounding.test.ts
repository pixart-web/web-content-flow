import { describe, expect, it } from "vitest";

import { PRODUCT_ATTRIBUTE_RULE, productGrounding } from "./product-grounding";

describe("product grounding (prompt 1.3.0)", () => {
  it("restates only the product facts the Brief supplies", () => {
    expect(
      productGrounding({
        brief: {
          productOrService: " Comfortable walking shoes ",
          primaryOffer: "City shoes",
          valueProposition: "Comfort for every journey",
          businessDescription: "not repeated",
        },
      }),
    ).toEqual({
      suppliedProductFacts: {
        productOrService: "Comfortable walking shoes",
        primaryOffer: "City shoes",
        valueProposition: "Comfort for every journey",
      },
      productAttributeRule: PRODUCT_ATTRIBUTE_RULE,
    });
  });

  it("adds nothing without product facts", () => {
    expect(productGrounding({ brief: {} })).toBeNull();
    expect(productGrounding(null)).toBeNull();
    expect(productGrounding("text")).toBeNull();
  });
});
