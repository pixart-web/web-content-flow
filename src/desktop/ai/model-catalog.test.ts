import { describe, expect, it } from "vitest";

import {
  CatalogEntrySchema,
  findCatalogEntry,
  MODEL_CATALOG,
} from "./model-catalog";

describe("model catalog (LF-14)", () => {
  it("has unique ids and tags with pinned digests and allowed licences", () => {
    expect(new Set(MODEL_CATALOG.map((e) => e.id)).size).toBe(
      MODEL_CATALOG.length,
    );
    expect(new Set(MODEL_CATALOG.map((e) => e.tag)).size).toBe(
      MODEL_CATALOG.length,
    );
    for (const entry of MODEL_CATALOG) {
      expect(entry.manifestDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(["Apache-2.0", "MIT"]).toContain(entry.license.spdx);
    }
  });

  it("rejects a model whose licence is not on the allow-list", () => {
    const entry = findCatalogEntry("gemma4-12b-qat")!;
    expect(
      CatalogEntrySchema.safeParse({
        ...entry,
        license: { ...entry.license, spdx: "Llama-Community" },
      }).success,
    ).toBe(false);
  });

  it("records the evaluation outcome of docs/technical/48", () => {
    expect(findCatalogEntry("gemma4-12b-qat")!.evaluation.status).toBe(
      "candidate",
    );
    expect(findCatalogEntry("qwen3.5-4b")!.evaluation.status).toBe(
      "not_recommended",
    );
    expect(findCatalogEntry("qwen3.5-9b")!.evaluation.status).toBe("rejected");
    expect(findCatalogEntry("missing")).toBeNull();
  });
});
