import { describe, expect, it, vi } from "vitest";

import {
  currentGenerationSignal,
  runWithGenerationSignal,
} from "./generation-signal";

vi.mock("server-only", () => ({}));

describe("generation signal context", () => {
  it("is undefined outside a job", () => {
    expect(currentGenerationSignal()).toBeUndefined();
  });

  it("exposes the job signal across awaits and reflects aborts", async () => {
    const controller = new AbortController();
    const seen = await runWithGenerationSignal(controller.signal, async () => {
      await Promise.resolve();
      const signal = currentGenerationSignal();
      controller.abort();
      return { same: signal === controller.signal, aborted: signal?.aborted };
    });
    expect(seen).toEqual({ same: true, aborted: true });
    expect(currentGenerationSignal()).toBeUndefined();
  });
});
