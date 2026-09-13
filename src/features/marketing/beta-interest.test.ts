import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  requestSubject: vi.fn().mockResolvedValue("subject-hash"),
  upsert: vi.fn().mockResolvedValue({ id: "interest_1" }),
}));

vi.mock("@/server/db/prisma", () => ({
  getPrisma: () => ({ betaInterest: { upsert: mocks.upsert } }),
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  requestSubject: mocks.requestSubject,
  RateLimitError: class RateLimitError extends Error {},
}));

import { submitBetaInterest } from "./beta-interest";

function validForm() {
  const form = new FormData();
  form.set("name", "Casey Morgan");
  form.set("email", "casey@example.test");
  form.set("companyOrProject", "Synthetic Studio");
  form.set("role", "FOUNDER");
  form.set(
    "primaryChallenge",
    "Keeping the same strategic direction across every content channel.",
  );
  form.set("currentTools", "Documents and spreadsheets");
  form.set("expectedMonthlyUsage", "20_100");
  form.set("consent", "on");
  return form;
}

describe("beta interest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid input before persistence", async () => {
    const result = await submitBetaInterest({ status: "idle" }, new FormData());
    expect(result.status).toBe("error");
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rate limits and persists one bounded interest record", async () => {
    const result = await submitBetaInterest({ status: "idle" }, validForm());
    expect(result.status).toBe("success");
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "beta-interest", limit: 5 }),
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "casey@example.test" },
      }),
    );
  });

  it("rejects the honeypot field", async () => {
    const form = validForm();
    form.set("website", "spam.example");
    const result = await submitBetaInterest({ status: "idle" }, form);
    expect(result.status).toBe("error");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
