import { describe, expect, it } from "vitest";

import { leaseRenewalIntervalMs, retryDelayMs } from "./job-lease";

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
});
