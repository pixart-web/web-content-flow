import { describe, expect, it } from "vitest";

import { monogram } from "./monogram";

describe("project monogram", () => {
  it("is stable per name and built only from design tokens", () => {
    expect(monogram("UrbanStride")).toBe(monogram("UrbanStride"));
    for (const name of ["UrbanStride", "A", "Café Lisboa", ""]) {
      const value = monogram(name);
      expect(value).toMatch(
        /^linear-gradient\(140deg, var\(--color-[a-z0-9-]+\), var\(--color-[a-z0-9-]+\)\)$/,
      );
      expect(value).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });
});
