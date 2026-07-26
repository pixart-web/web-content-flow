import { describe, expect, it } from "vitest";

import { createContentAnalyticsEvent } from "./content-events";

describe("content analytics allowlist", () => {
  it("accepts only operational metadata", () => {
    expect(
      createContentAnalyticsEvent({
        name: "content_item_generated",
        properties: {
          projectId: "project-0001",
          module: "COPY",
          contentType: "FOUNDATION_COPY",
          mock: true,
        },
      }),
    ).toMatchObject({ name: "content_item_generated" });
  });

  it("rejects snapshots or titles", () => {
    expect(() =>
      createContentAnalyticsEvent({
        name: "library_viewed",
        properties: {
          projectId: "project-0001",
          title: "customer content",
        },
      } as never),
    ).toThrow();
  });
});
