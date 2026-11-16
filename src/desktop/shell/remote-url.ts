import type { DesktopRemoteServerResult } from "./desktop-api";

// L7: pure checks for a private-server address (no Electron imports).

export function validateRemoteServerUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return new URL(url.origin);
}

export async function probeRemoteServer(
  url: URL,
  fetchImpl: typeof fetch = fetch,
): Promise<DesktopRemoteServerResult> {
  try {
    const response = await fetchImpl(new URL("/health/live", url), {
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    return response.ok
      ? { ok: true }
      : { ok: false, reason: "not_web_content_flow" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
