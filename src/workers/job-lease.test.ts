import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  automaticRetryAllowed,
  leaseRenewalIntervalMs,
  retryDelayMs,
} from "./job-lease";

describe("job lease policy", () => {
  it("renews before one third of the lease", () => {
    expect(leaseRenewalIntervalMs(90_000)).toBeLessThan(30_000);
  });

  it("uses bounded retry delays and clamps Retry-After", () => {
    expect(retryDelayMs(1)).toBeGreaterThanOrEqual(4_500);
    expect(retryDelayMs(4)).toBeLessThanOrEqual(132_000);
    expect(retryDelayMs(1, 900_000)).toBe(300_000);
    expect(retryDelayMs(1, -20)).toBeGreaterThanOrEqual(1_000);
  });

  it("caps automatic retries by AI_MAX_RETRIES and maxAttempts", () => {
    const allowed = (
      attempt: number,
      maxAttempts: number,
      maxRetries: number,
    ) => automaticRetryAllowed({ attempt, maxAttempts, maxRetries });
    expect(allowed(2, 3, 2)).toBe(true);
    expect(allowed(3, 3, 2)).toBe(false);
    expect(allowed(1, 3, 0)).toBe(false);
    expect(allowed(2, 3, 1)).toBe(false);
    expect(allowed(1, 1, 3)).toBe(false);
  });
});
