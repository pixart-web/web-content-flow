import { describe, expect, it } from "vitest";

import {
  csvCell,
  renderJson,
  renderMarkdown,
  sanitizeFilename,
  type ExportableVersion,
} from "./formatters";

const entry: ExportableVersion = {
  itemId: "content-item-test",
  title: "Launch copy",
  module: "COPY",
  type: "FOUNDATION_COPY",
  versionId: "content-version-test",
  versionNumber: 2,
  schemaVersion: "1.0",
  snapshot: {
    schemaVersion: "1.0",
    title: "Launch copy",
    objective: "Explain the launch",
    headline: "One connected workflow",
    body: "Review before publishing.",
    callToAction: "Create project",
  },
  provenance: { mock: true },
};

describe("export formatters", () => {
  it("sanitizes paths and control characters", () => {
    expect(sanitizeFilename("../../project\\secret\u0000")).toBe(
      "project-secret-",
    );
  });

  it("prevents spreadsheet formula execution", () => {
    expect(csvCell("=cmd()")).toBe('"\'=cmd()"');
    expect(csvCell("+SUM(1,2)")).toBe('"\'+SUM(1,2)"');
  });

  it("renders validated Markdown and JSON without internal payloads", () => {
    expect(renderMarkdown([entry])).toContain("# Launch copy");
    const json = JSON.parse(renderJson([entry])) as Record<string, unknown>;
    expect(json.schemaVersion).toBe("1.0");
    expect(JSON.stringify(json)).not.toContain("password");
  });
});
