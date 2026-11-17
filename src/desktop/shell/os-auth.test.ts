import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  authenticateOwner,
  encodePowerShell,
  type Exec,
  POLKIT_ACTION_ID,
  polkitSubject,
  WINDOWS_HELLO_SCRIPT,
  windowsPowerShellPath,
} from "./os-auth";

// L8: the OS confirms the owner before a password reset (decision L-8).

const recorder = (codes: Record<string, number>) => {
  const calls: {
    file: string;
    args: readonly string[];
    env?: Readonly<Record<string, string | undefined>> | undefined;
  }[] = [];
  const exec: Exec = async (file, args, options) => {
    calls.push({ file, args, env: options.env });
    const name = file.split(/[\\/]/).pop()!;
    return { code: codes[name] ?? 0, stdout: "" };
  };
  return { calls, exec };
};

describe("authenticateOwner", () => {
  it("macOS: maps the helper's exit codes", async () => {
    for (const [code, outcome] of [
      [0, "authenticated"],
      [1, "denied"],
      [3, "unavailable"],
      [-1, "unavailable"],
    ] as const) {
      const { exec, calls } = recorder({ "wcf-os-auth": code });
      expect(
        await authenticateOwner({
          platform: "darwin",
          reason: "reset",
          macHelper: "/app/bin/wcf-os-auth",
          exec,
          exists: () => true,
        }),
      ).toBe(outcome);
      expect(calls[0]!.args).toEqual(["reset"]);
    }
    expect(
      await authenticateOwner({
        platform: "darwin",
        reason: "reset",
        macHelper: "/missing",
        exists: () => false,
      }),
    ).toBe("unavailable");
  });

  it("Windows: runs Windows PowerShell by absolute path with the reason in the environment", async () => {
    const { exec, calls } = recorder({ "powershell.exe": 0 });
    const env = { SystemRoot: "C:\\Windows" };
    expect(
      await authenticateOwner({
        platform: "win32",
        reason: "reset the password; $(rm -rf)",
        macHelper: "",
        env,
        exec,
        exists: () => true,
      }),
    ).toBe("authenticated");
    expect(calls[0]!.file).toBe(windowsPowerShellPath(env));
    expect(calls[0]!.args).toContain("-EncodedCommand");
    expect(calls[0]!.args.join(" ")).not.toContain("rm -rf");
    expect(calls[0]!.env).toMatchObject({
      WCF_OS_AUTH_REASON: "reset the password; $(rm -rf)",
      WCF_OS_AUTH_MODE: "authenticate",
    });
    const encoded = calls[0]!.args.at(-1)!;
    expect(Buffer.from(encoded, "base64").toString("utf16le")).toBe(
      WINDOWS_HELLO_SCRIPT,
    );
  });

  it("Windows: denied and unavailable (Hello not set up)", async () => {
    for (const [code, outcome] of [
      [1, "denied"],
      [3, "unavailable"],
    ] as const) {
      const { exec } = recorder({ "powershell.exe": code });
      expect(
        await authenticateOwner({
          platform: "win32",
          reason: "r",
          macHelper: "",
          env: {},
          exec,
          exists: () => true,
        }),
      ).toBe(outcome);
    }
  });

  it("the Windows script checks availability before asking and awaits WinRT", () => {
    expect(WINDOWS_HELLO_SCRIPT).toContain("CheckAvailabilityAsync");
    expect(WINDOWS_HELLO_SCRIPT).toContain(
      "RequestVerificationAsync($env:WCF_OS_AUTH_REASON)",
    );
    expect(WINDOWS_HELLO_SCRIPT).toContain("IAsyncOperation`1");
    expect(encodePowerShell("a")).toBe(
      Buffer.from("a", "utf16le").toString("base64"),
    );
  });

  it("Linux: asks polkit for our own action only", async () => {
    const { exec, calls } = recorder({ pkaction: 0, pkcheck: 0 });
    expect(
      await authenticateOwner({
        platform: "linux",
        reason: "r",
        macHelper: "",
        pid: 4242,
        uid: 1000,
        exec,
        exists: (path) => path.startsWith("/usr/bin/"),
        readStat: () =>
          "4242 (electron app) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 987654 20",
      }),
    ).toBe("authenticated");
    expect(calls.map((call) => call.file)).toEqual([
      "/usr/bin/pkaction",
      "/usr/bin/pkcheck",
    ]);
    expect(calls[1]!.args).toEqual([
      "--action-id",
      POLKIT_ACTION_ID,
      "--process",
      "4242,987654,1000",
      "--allow-user-interaction",
    ]);
  });

  it("Linux: unavailable without the registered action (tar.gz) or polkit; denied when refused or dismissed", async () => {
    const notRegistered = recorder({ pkaction: 1 });
    expect(
      await authenticateOwner({
        platform: "linux",
        reason: "r",
        macHelper: "",
        exec: notRegistered.exec,
        exists: () => true,
      }),
    ).toBe("unavailable");
    expect(notRegistered.calls).toHaveLength(1);
    expect(
      await authenticateOwner({
        platform: "linux",
        reason: "r",
        macHelper: "",
        exists: () => false,
      }),
    ).toBe("unavailable");
    for (const [code, outcome] of [
      [1, "denied"],
      [3, "denied"],
      [2, "unavailable"],
      [4, "unavailable"],
    ] as const) {
      const { exec } = recorder({ pkaction: 0, pkcheck: code });
      expect(
        await authenticateOwner({
          platform: "linux",
          reason: "r",
          macHelper: "",
          pid: 1,
          uid: 1,
          exec,
          exists: () => true,
          readStat: () => "",
        }),
      ).toBe(outcome);
    }
  });

  it("other platforms are unavailable", async () => {
    expect(
      await authenticateOwner({
        platform: "freebsd",
        reason: "r",
        macHelper: "",
      }),
    ).toBe("unavailable");
  });
});

describe("polkit", () => {
  it("subject falls back to the bare pid when /proc is unreadable", () => {
    expect(
      polkitSubject(7, 1000, () => {
        throw new Error("no /proc");
      }),
    ).toBe("7");
  });

  it("policy lets only the active session's own user authenticate", () => {
    const xml = readFileSync(
      "src/desktop/linux/com.webcontentflow.desktop.policy",
      "utf8",
    );
    expect(xml).toContain(`<action id="${POLKIT_ACTION_ID}">`);
    expect(xml).toContain("<allow_active>auth_self</allow_active>");
    expect(xml).toContain("<allow_any>no</allow_any>");
    expect(xml).toContain("<allow_inactive>no</allow_inactive>");
  });
});
