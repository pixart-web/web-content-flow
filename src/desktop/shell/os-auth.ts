import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// L4c / L8 (decision L-8): before the owner password is reset, the operating
// system confirms that the person at the computer is its user, in its own
// dialog. The system password never reaches Web Content Flow.
//   macOS    bin/wcf-os-auth (LocalAuthentication: Touch ID or account password)
//   Windows  Windows Hello (UserConsentVerifier: PIN, face or fingerprint)
//   Linux    polkit, action com.webcontentflow.desktop.reset-owner-password
//            (auth_self: the logged-in user's own password), installed by the
//            .deb from src/desktop/linux/com.webcontentflow.desktop.policy. Without it (tar.gz) the reset is unavailable.

export type OsAuthOutcome = "authenticated" | "denied" | "unavailable";

export const POLKIT_ACTION_ID =
  "com.webcontentflow.desktop.reset-owner-password";

type Env = Readonly<Record<string, string | undefined>>;

export type ExecResult = { code: number; stdout: string };
export type Exec = (
  file: string,
  args: readonly string[],
  options: { env?: Env; windowsHide?: boolean },
) => Promise<ExecResult>;

const defaultExec: Exec = (file, args, options) =>
  new Promise((resolve) => {
    execFile(
      file,
      [...args],
      {
        ...(options.windowsHide ? { windowsHide: true } : {}),
        ...(options.env ? { env: options.env as NodeJS.ProcessEnv } : {}),
      },
      (error, stdout) => {
        const code =
          error === null
            ? 0
            : typeof (error as { code?: unknown }).code === "number"
              ? ((error as { code: number }).code as number)
              : -1; // could not start (ENOENT and similar)
        resolve({ code, stdout: String(stdout ?? "") });
      },
    );
  });

// Windows PowerShell 5.1 ships with every supported Windows and can call the
// WinRT UserConsentVerifier without a native helper. The reason comes in an
// environment variable, never in the script text.
export const WINDOWS_HELLO_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${"`"}1'
  } | Select-Object -First 1
  function Wait-WinRt($operation, [Type] $type) {
    $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
    $task.Wait() | Out-Null
    $task.Result
  }
  $availability = Wait-WinRt ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
  if ($availability -ne [Windows.Security.Credentials.UI.UserConsentVerifierAvailability]::Available) {
    "unavailable:$availability"; exit 3
  }
  if ($env:WCF_OS_AUTH_MODE -eq 'check') { 'available'; exit 0 }
  $result = Wait-WinRt ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($env:WCF_OS_AUTH_REASON)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
  if ($result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) { 'authenticated'; exit 0 }
  "denied:$result"; exit 1
} catch {
  "unavailable:error"; exit 3
}
`;

export function windowsPowerShellPath(env: Env = process.env) {
  return join(
    env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

export function encodePowerShell(script: string) {
  return Buffer.from(script, "utf16le").toString("base64");
}

// polkit subject "pid,start-time,uid": immune to pid reuse.
export function polkitSubject(
  pid: number,
  uid: number,
  readStat: (path: string) => string = (path) => readFileSync(path, "utf8"),
) {
  try {
    const stat = readStat(`/proc/${pid}/stat`);
    // Field 22 (starttime); the command name in field 2 may contain spaces.
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const startTime = fields[19];
    if (startTime && /^\d+$/.test(startTime))
      return `${pid},${startTime},${uid}`;
  } catch {
    // fall through to the bare pid
  }
  return String(pid);
}

const linuxBinary = (name: string, exists: (path: string) => boolean) =>
  ["/usr/bin", "/bin"].map((dir) => `${dir}/${name}`).find(exists);

export async function authenticateOwner(input: {
  platform: NodeJS.Platform;
  reason: string;
  macHelper: string;
  pid?: number;
  uid?: number;
  mode?: "authenticate" | "check";
  env?: Env;
  exec?: Exec;
  exists?: (path: string) => boolean;
  readStat?: (path: string) => string;
}): Promise<OsAuthOutcome> {
  const exec = input.exec ?? defaultExec;
  const exists = input.exists ?? existsSync;
  const check = input.mode === "check";

  if (input.platform === "darwin") {
    if (!exists(input.macHelper)) return "unavailable";
    const { code } = await exec(
      input.macHelper,
      [check ? "--check" : input.reason],
      {},
    );
    return code === 0 ? "authenticated" : code === 1 ? "denied" : "unavailable";
  }

  if (input.platform === "win32") {
    const env = input.env ?? process.env;
    const powershell = windowsPowerShellPath(env);
    if (!exists(powershell)) return "unavailable";
    const { code } = await exec(
      powershell,
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodePowerShell(WINDOWS_HELLO_SCRIPT),
      ],
      {
        env: {
          ...env,
          WCF_OS_AUTH_REASON: input.reason,
          WCF_OS_AUTH_MODE: check ? "check" : "authenticate",
        },
        windowsHide: true,
      },
    );
    return code === 0 ? "authenticated" : code === 1 ? "denied" : "unavailable";
  }

  if (input.platform === "linux") {
    const pkaction = linuxBinary("pkaction", exists);
    const pkcheck = linuxBinary("pkcheck", exists);
    if (!pkaction || !pkcheck) return "unavailable";
    // Only our own action (auth_self). Never fall back to a generic
    // administrator action: its dialog would describe something else.
    const registered = await exec(
      pkaction,
      ["--action-id", POLKIT_ACTION_ID],
      {},
    );
    if (registered.code !== 0) return "unavailable";
    if (check) return "authenticated";
    const subject = polkitSubject(
      input.pid ?? process.pid,
      input.uid ?? process.getuid?.() ?? 0,
      input.readStat,
    );
    const { code } = await exec(
      pkcheck,
      [
        "--action-id",
        POLKIT_ACTION_ID,
        "--process",
        subject,
        "--allow-user-interaction",
      ],
      {},
    );
    // pkcheck: 0 authorized, 1 not authorized, 3 dismissed, 2/4 other.
    return code === 0
      ? "authenticated"
      : code === 1 || code === 3
        ? "denied"
        : "unavailable";
  }

  return "unavailable";
}
