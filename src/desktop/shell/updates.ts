import type { DesktopUpdateCheck } from "./desktop-api";

// LF-20 (update notice): the desktop app asks GitHub Releases for the latest
// version only when the person asks (Settings or the app menu). Nothing is
// checked in the background and nothing is downloaded or installed: the
// answer is a version number and a link to the release page. Unsigned builds
// cannot update themselves safely, so installing stays a manual step.

export const RELEASES_API =
  "https://api.github.com/repos/pixart-web/web-content-flow/releases/latest";
export const RELEASE_PAGE_PREFIX =
  "https://github.com/pixart-web/web-content-flow/releases/";

type Version = [number, number, number];

export function parseVersion(input: string): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(input.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative when a < b, 0 when equal, positive when a > b. */
export function compareVersions(a: Version, b: Version) {
  for (let index = 0; index < 3; index += 1) {
    const difference = a[index]! - b[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export function isReleasePage(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(RELEASE_PAGE_PREFIX) &&
    !url.includes("..")
  );
}

export async function checkForUpdate(input: {
  currentVersion: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): Promise<DesktopUpdateCheck> {
  const current = input.currentVersion;
  const doFetch = input.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        // A generic client name: nothing about this computer or its owner.
        "User-Agent": "WebContentFlow-Desktop",
      },
      signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
    });
  } catch {
    return { state: "unavailable", current, reason: "offline" };
  }
  // No published release yet.
  if (response.status === 404)
    return { state: "unavailable", current, reason: "no_releases" };
  if (!response.ok) return { state: "unavailable", current, reason: "failed" };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { state: "unavailable", current, reason: "failed" };
  }
  const release = body as {
    tag_name?: unknown;
    html_url?: unknown;
    published_at?: unknown;
    draft?: unknown;
    prerelease?: unknown;
  };
  const latest =
    typeof release.tag_name === "string"
      ? parseVersion(release.tag_name)
      : null;
  if (
    !latest ||
    release.draft === true ||
    release.prerelease === true ||
    !isReleasePage(release.html_url)
  )
    return { state: "unavailable", current, reason: "failed" };
  const latestText = latest.join(".");
  const installed = parseVersion(current);
  // Development builds (0.0.0 or no version) always see the latest release.
  if (installed && compareVersions(latest, installed) <= 0)
    return { state: "up_to_date", current, latest: latestText };
  return {
    state: "available",
    current,
    latest: latestText,
    url: release.html_url,
    publishedAt:
      typeof release.published_at === "string" ? release.published_at : null,
  };
}

/** One sentence for Settings and the Help menu dialog. */
export function updateMessage(result: DesktopUpdateCheck) {
  if (result.state === "available")
    return `Version ${result.latest} is available. This computer has ${result.current}.`;
  if (result.state === "up_to_date")
    return `Web Content Flow ${result.current} is the latest version.`;
  if (result.reason === "offline")
    return "Could not reach GitHub. Check the network and try again.";
  if (result.reason === "no_releases")
    return "No version has been published yet.";
  return "Could not read the latest version. Try again later.";
}
