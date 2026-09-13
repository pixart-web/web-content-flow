import { describe, expect, it } from "vitest";

import { transformCaptureJson } from "./capture-fixture";

describe("Northstar capture fixture", () => {
  it("is deterministic and recursively replaces the synthetic source brand", () => {
    const input = {
      title: "UrbanStride first collection",
      values: ["urban footwear", { audience: "Urban professionals" }],
    };
    const first = transformCaptureJson(input);
    expect(first).toEqual(transformCaptureJson(input));
    expect(JSON.stringify(first)).toContain("Northstar Roasters");
    expect(JSON.stringify(first)).toContain("specialty coffee");
    expect(JSON.stringify(first)).not.toContain("UrbanStride");
  });
});
