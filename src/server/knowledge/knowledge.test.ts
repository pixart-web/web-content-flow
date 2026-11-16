import { describe, expect, it } from "vitest";

import { CHUNK_TARGET_CHARS, chunkText } from "./chunking";
import { decodeVector, dot, encodeVector, normalize } from "./vectors";

describe("knowledge chunking (L6)", () => {
  it("keeps short paragraphs together and splits long text near the target size", () => {
    expect(chunkText("Uma frase.\n\nOutra frase.")).toEqual([
      { ordinal: 0, text: "Uma frase. Outra frase.", tokenEstimate: 6 },
    ]);
    const paragraph = "A sola é de borracha reciclada. ".repeat(120);
    const chunks = chunkText(`${paragraph}\n\n${paragraph}`);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks)
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_TARGET_CHARS + 200);
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
  });

  it("overlaps consecutive chunks so facts on a boundary are not lost", () => {
    const text = Array.from(
      { length: 120 },
      (_, i) => `Facto número ${i}.`,
    ).join("\n\n");
    const [first, second] = chunkText(text);
    expect(second).toBeDefined();
    const tail = first!.text.slice(-40);
    expect(second!.text.includes(tail.slice(tail.indexOf(" ") + 1))).toBe(true);
  });

  it("ignores empty input", () => {
    expect(chunkText("  \n\n  ")).toEqual([]);
  });
});

describe("knowledge vectors (L6)", () => {
  it("normalises, stores as Float32 bytes and compares by dot product", () => {
    const a = normalize([3, 4]);
    expect(Array.from(a)).toEqual([0.6000000238418579, 0.800000011920929]);
    const roundTrip = decodeVector(encodeVector(a));
    expect(dot(roundTrip, a)).toBeCloseTo(1, 6);
    expect(dot(normalize([1, 0]), normalize([0, 1]))).toBe(0);
  });

  it("rejects zero vectors, corrupt bytes and mismatched dimensions", () => {
    expect(() => normalize([0, 0])).toThrow(/zero/);
    expect(() => decodeVector(new Uint8Array(5))).toThrow(/Corrupt/);
    expect(() => dot(normalize([1, 0]), normalize([1, 0, 0]))).toThrow(
      /differ/,
    );
  });
});
