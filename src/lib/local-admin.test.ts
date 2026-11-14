import { describe, expect, it } from "vitest";

import { checkLocalAdminRequest, ownerPasswordSchema } from "./local-admin";

const admin = "a".repeat(64);

describe("local administration requests", () => {
  it("does not exist in server mode", () => {
    expect(
      checkLocalAdminRequest({
        appMode: "server",
        expectedAdminToken: admin,
        providedAdminToken: admin,
      }),
    ).toEqual({ ok: false, status: 404 });
  });

  it("needs the shell's admin token, not just any token", () => {
    expect(
      checkLocalAdminRequest({
        appMode: "local",
        expectedAdminToken: admin,
        providedAdminToken: admin,
      }),
    ).toEqual({ ok: true });
    for (const provided of [null, "w".repeat(64), `${admin}x`])
      expect(
        checkLocalAdminRequest({
          appMode: "local",
          expectedAdminToken: admin,
          providedAdminToken: provided,
        }),
      ).toEqual({ ok: false, status: 403 });
  });

  it("refuses everything when no admin token is configured", () => {
    expect(
      checkLocalAdminRequest({
        appMode: "local",
        expectedAdminToken: undefined,
        providedAdminToken: "",
      }),
    ).toEqual({ ok: false, status: 403 });
  });

  it("applies the account password policy", () => {
    expect(ownerPasswordSchema.safeParse({ password: "short" }).success).toBe(
      false,
    );
    expect(
      ownerPasswordSchema.safeParse({ password: "long-enough-password" })
        .success,
    ).toBe(true);
  });
});
