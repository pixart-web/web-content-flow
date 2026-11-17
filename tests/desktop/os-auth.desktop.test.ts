import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  authenticateOwner,
  encodePowerShell,
  POLKIT_ACTION_ID,
  WINDOWS_HELLO_SCRIPT,
  windowsPowerShellPath,
} from "../../src/desktop/shell/os-auth";

// L8: the real operating-system side of the owner password reset, without
// a person at the keyboard: the checks never open a dialog.

const run = promisify(execFile);

describe.runIf(process.platform === "win32")("Windows Hello", () => {
  it("the script loads WinRT and reports availability (no error path)", async () => {
    const result = await run(
      windowsPowerShellPath(),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodePowerShell(WINDOWS_HELLO_SCRIPT),
      ],
      {
        env: { ...process.env, WCF_OS_AUTH_MODE: "check" },
        windowsHide: true,
      },
    ).catch((error: { code: number; stdout: string }) => error);
    // A CI runner has no Windows Hello: "unavailable:<availability>" and
    // exit 3. "unavailable:error" would mean the WinRT call itself broke.
    expect(result.stdout.trim()).toMatch(
      /^(available|unavailable:(?!error)[A-Za-z]+)$/,
    );
  });

  it("maps a runner without Windows Hello to unavailable", async () => {
    expect(
      await authenticateOwner({
        platform: "win32",
        reason: "check",
        macHelper: "",
        mode: "check",
      }),
    ).toMatch(/^(authenticated|unavailable)$/);
  });
});

describe.runIf(
  process.platform === "linux" && process.env.WCF_POLKIT_POLICY_INSTALLED,
)("polkit", () => {
  it("polkit accepts the installed action with auth_self for the active user", async () => {
    const { stdout } = await run("pkaction", [
      "--action-id",
      POLKIT_ACTION_ID,
      "--verbose",
    ]);
    expect(stdout).toMatch(/implicit active:\s+auth_self/);
    expect(stdout).toMatch(/implicit any:\s+no/);
    expect(
      await authenticateOwner({
        platform: "linux",
        reason: "check",
        macHelper: "",
        mode: "check",
        exists: existsSync,
      }),
    ).toBe("authenticated");
  });
});
