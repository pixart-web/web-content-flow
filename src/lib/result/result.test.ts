import { isSuccess, type Result } from "./result";

describe("Result", () => {
  it("narrows a successful result", () => {
    const result: Result<number, string> = { ok: true, value: 42 };

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(42);
    }
  });

  it("preserves a typed error", () => {
    const result: Result<number, string> = { ok: false, error: "invalid" };

    expect(isSuccess(result)).toBe(false);
    expect(result).toEqual({ ok: false, error: "invalid" });
  });
});
