import { describe, expect, it } from "vitest";

import { productMedia } from "./product-media";

describe("product media registry", () => {
  it("contains bounded authentic-poster entries without false video paths", () => {
    expect(Object.keys(productMedia)).toHaveLength(8);
    for (const media of Object.values(productMedia)) {
      expect(media.status).toBe("captured");
      expect(media.poster).toMatch(/^\/marketing\/posters\/.+\.webp$/);
      expect(media.mobileFallback).toMatch(/-mobile\.webp$/);
      expect(media.webm).toBeNull();
      expect(media.mp4).toBeNull();
      expect(media.muted).toBe(true);
      expect(media.description.length).toBeGreaterThan(30);
    }
  });
});
