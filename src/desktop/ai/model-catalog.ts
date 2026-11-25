import { z } from "zod";

// L3 (LF-14, ADR L-5): the models the desktop edition may offer. Each entry
// pins the Ollama manifest digest (an update is an explicit catalog change),
// states the licence from the model's own licence file, the hardware profile
// it needs and its evaluation status (docs/technical/48). The licence is shown
// and accepted BEFORE download, because `ollama show --license` only works
// once the model is on disk (L0 finding).

export const hardwareProfiles = ["essential", "standard", "advanced"] as const;
export type HardwareProfile = (typeof hardwareProfiles)[number];

// Licences that let the end user use generated content commercially. A model
// with any other licence cannot enter the catalog.
export const ALLOWED_LICENSES = ["Apache-2.0", "MIT"] as const;

export const CatalogEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9.-]*$/),
    displayName: z.string().min(1),
    runtime: z.literal("ollama"),
    tag: z.string().regex(/^[a-z0-9._-]+:[a-z0-9._-]+$/),
    manifestDigest: z.string().regex(/^[0-9a-f]{64}$/),
    sizeBytes: z.number().int().positive(),
    parameters: z.string(),
    license: z
      .object({
        spdx: z.enum(ALLOWED_LICENSES),
        // Verified against the licence text shipped with the model.
        verifiedAt: z.iso.date(),
        url: z.url(),
      })
      .strict(),
    minProfile: z.enum(hardwareProfiles),
    structuredMode: z.enum(["native_schema", "json_mode", "prompted"]),
    evaluation: z
      .object({
        suite: z.string(),
        status: z.enum(["candidate", "not_recommended", "rejected"]),
        summary: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;

const entries: CatalogEntry[] = [
  {
    id: "gemma4-12b-qat",
    displayName: "Gemma 4 12B (QAT)",
    runtime: "ollama",
    tag: "gemma4:12b-it-qat",
    manifestDigest:
      "38044be4f923e5a55264ed7df4eaac2676651a905f735197c504045140c02bd3",
    sizeBytes: 7_151_003_754,
    parameters: "11.9B Q4_0",
    license: {
      spdx: "Apache-2.0",
      verifiedAt: "2026-11-14",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
    minProfile: "standard",
    structuredMode: "native_schema",
    evaluation: {
      suite: "1.6.0",
      status: "candidate",
      summary:
        "Passed all nine evaluation cases on Apple M4 (suite 1.6.0, 5 samples each): valid structure, no invented attributes; human review still required.",
    },
  },
  {
    id: "qwen3.5-4b",
    displayName: "Qwen 3.5 4B",
    runtime: "ollama",
    tag: "qwen3.5:4b",
    manifestDigest:
      "7f3251fa6878a78a606bcb3c074283306e5ad2ea411a7774a9dd98a4bc7f2d13",
    sizeBytes: 3_973_305_013,
    parameters: "4.5B nvfp4",
    license: {
      spdx: "Apache-2.0",
      verifiedAt: "2026-11-14",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
    minProfile: "essential",
    structuredMode: "prompted",
    evaluation: {
      suite: "1.2.0",
      status: "not_recommended",
      summary:
        "Invents product attributes in most product descriptions; Brand Profile 4/5.",
    },
  },
  {
    id: "qwen3.5-9b",
    displayName: "Qwen 3.5 9B",
    runtime: "ollama",
    tag: "qwen3.5:9b",
    manifestDigest:
      "d63f830f28d515fefea546f213fca7a75e9dd5176ef51a6deabc952d1c99a911",
    sizeBytes: 7_639_229_431,
    parameters: "9.7B nvfp4",
    license: {
      spdx: "Apache-2.0",
      verifiedAt: "2026-11-14",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
    minProfile: "standard",
    structuredMode: "prompted",
    evaluation: {
      suite: "1.1.0",
      status: "rejected",
      summary: "Misses the seoTitle length limit in every product description.",
    },
  },
  {
    // LF-19 (2026-11-24): first candidate for 16 GB Macs. Valid structure but
    // invents product attributes in most text modules (docs/technical/48).
    id: "ministral-3-3b",
    displayName: "Ministral 3 3B",
    runtime: "ollama",
    tag: "ministral-3:3b",
    manifestDigest:
      "f04aa1c738f64e13c625b82ae92504fc0260fa6723b509ed1ece0fa188179b1d",
    sizeBytes: 2_953_840_808,
    parameters: "3.8B Q4_K_M",
    license: {
      spdx: "Apache-2.0",
      verifiedAt: "2026-11-24",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
    minProfile: "essential",
    structuredMode: "native_schema",
    evaluation: {
      suite: "1.6.0",
      status: "rejected",
      summary:
        "72 invented product attributes in 45 samples (6 of 9 cases); Video script schema valid 3 of 5 times.",
    },
  },
  {
    id: "phi4-mini-3.8b",
    displayName: "Phi-4 mini 3.8B",
    runtime: "ollama",
    tag: "phi4-mini:3.8b",
    manifestDigest:
      "78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753",
    sizeBytes: 2_491_876_774,
    parameters: "3.8B Q4_K_M",
    license: {
      spdx: "MIT",
      verifiedAt: "2026-11-25",
      url: "https://opensource.org/license/mit",
    },
    minProfile: "essential",
    structuredMode: "native_schema",
    evaluation: {
      suite: "1.6.0",
      status: "rejected",
      summary:
        "Fewest invented attributes of the small models (10 in 45 samples), but Brand Profile is valid only 1 time in 5.",
    },
  },
  {
    id: "granite4-3b",
    displayName: "Granite 4 3B",
    runtime: "ollama",
    tag: "granite4:3b",
    manifestDigest:
      "89962fcc75239ac434cdebceb6b7e0669397f92eaef9c487774b718bc36a3e5f",
    sizeBytes: 2_099_521_385,
    parameters: "3.4B Q4_K_M",
    license: {
      spdx: "Apache-2.0",
      verifiedAt: "2026-11-25",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
    minProfile: "essential",
    structuredMode: "native_schema",
    evaluation: {
      suite: "1.6.0",
      status: "rejected",
      summary:
        "51 invented product attributes in 45 samples (5 of 9 cases); Video script valid 4 of 5 times.",
    },
  },
];

export const MODEL_CATALOG: readonly CatalogEntry[] = Object.freeze(
  entries.map((entry) => CatalogEntrySchema.parse(entry)),
);

export function findCatalogEntry(id: string) {
  return MODEL_CATALOG.find((entry) => entry.id === id) ?? null;
}
