import { describe, expect, it } from "vitest";

import { ProjectBriefSchema } from "./brief-schema";
import { validBrief } from "../../../tests/fixtures/phase-2";

describe("ProjectBriefSchema", () => {
  it("accepts a complete bounded brief", () => {
    expect(ProjectBriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("rejects an incomplete brief", () => {
    expect(
      ProjectBriefSchema.safeParse({
        ...validBrief,
        project: { ...validBrief.project, projectName: "" },
      }).success,
    ).toBe(false);
  });
});
