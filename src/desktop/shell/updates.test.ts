import { describe, expect, it, vi } from "vitest";

import {
  checkForUpdate,
  compareVersions,
  isReleasePage,
  parseVersion,
  RELEASES_API,
  updateMessage,
} from "./updates";

const page =
  "https://github.com/pixart-web/web-content-flow/releases/tag/v0.2.0";

function reply(status: number, body?: unknown) {
  return vi.fn(async () =>
    status === 404 || body === undefined
      ? new Response(null, { status })
      : Response.json(body, { status }),
  ) as unknown as typeof fetch;
}

describe("version helpers", () => {
  it("parses plain and v-prefixed versions only", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("0.10.0")).toEqual([0, 10, 0]);
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("1.2.3-beta.1")).toBeNull();
  });

  it("compares numerically, not as text", () => {
    expect(compareVersions([0, 10, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareVersions([1, 0, 0], [1, 0, 1])).toBeLessThan(0);
  });

  it("accepts only this repository's release pages", () => {
    expect(isReleasePage(page)).toBe(true);
    expect(isReleasePage("https://github.com/other/repo/releases/x")).toBe(
      false,
    );
    expect(
      isReleasePage(
        "https://github.com/pixart-web/web-content-flow/releases/../../x",
      ),
    ).toBe(false);
    expect(isReleasePage(42)).toBe(false);
  });
});

describe("checkForUpdate", () => {
  it("asks the releases API with a generic client name", async () => {
    const fetch = reply(200, { tag_name: "v0.2.0", html_url: page });
    await checkForUpdate({ currentVersion: "0.2.0", fetch });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(url).toBe(RELEASES_API);
    expect(init.headers["User-Agent"]).toBe("WebContentFlow-Desktop");
  });

  it("reports a newer release with its page", async () => {
    await expect(
      checkForUpdate({
        currentVersion: "0.1.4",
        fetch: reply(200, {
          tag_name: "v0.2.0",
          html_url: page,
          published_at: "2026-11-27T10:00:00Z",
        }),
      }),
    ).resolves.toEqual({
      state: "available",
      current: "0.1.4",
      latest: "0.2.0",
      url: page,
      publishedAt: "2026-11-27T10:00:00Z",
    });
  });

  it("is up to date on the same or a newer version", async () => {
    for (const currentVersion of ["0.2.0", "0.3.0"])
      await expect(
        checkForUpdate({
          currentVersion,
          fetch: reply(200, { tag_name: "v0.2.0", html_url: page }),
        }),
      ).resolves.toMatchObject({ state: "up_to_date", latest: "0.2.0" });
  });

  it("treats a development build as older than any release", async () => {
    await expect(
      checkForUpdate({
        currentVersion: "0.0.0",
        fetch: reply(200, { tag_name: "v0.1.0", html_url: page }),
      }),
    ).resolves.toMatchObject({ state: "available", latest: "0.1.0" });
  });

  it("explains why it could not tell", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(
      checkForUpdate({ currentVersion: "0.1.0", fetch: offline }),
    ).resolves.toMatchObject({ state: "unavailable", reason: "offline" });
    await expect(
      checkForUpdate({ currentVersion: "0.1.0", fetch: reply(404) }),
    ).resolves.toMatchObject({ state: "unavailable", reason: "no_releases" });
    await expect(
      checkForUpdate({ currentVersion: "0.1.0", fetch: reply(503) }),
    ).resolves.toMatchObject({ state: "unavailable", reason: "failed" });
  });

  it("ignores drafts, pre-releases and links outside the repository", async () => {
    for (const body of [
      { tag_name: "v0.2.0", html_url: page, prerelease: true },
      { tag_name: "v0.2.0", html_url: page, draft: true },
      { tag_name: "v0.2.0", html_url: "https://evil.example/releases/" },
      { tag_name: "latest", html_url: page },
    ])
      await expect(
        checkForUpdate({ currentVersion: "0.1.0", fetch: reply(200, body) }),
      ).resolves.toMatchObject({ state: "unavailable", reason: "failed" });
  });
});

describe("updateMessage", () => {
  it("says what happened in one sentence", () => {
    expect(
      updateMessage({
        state: "available",
        current: "0.1.0",
        latest: "0.2.0",
        url: page,
        publishedAt: null,
      }),
    ).toBe("Version 0.2.0 is available. This computer has 0.1.0.");
    expect(
      updateMessage({ state: "up_to_date", current: "0.2.0", latest: "0.2.0" }),
    ).toBe("Web Content Flow 0.2.0 is the latest version.");
    expect(
      updateMessage({
        state: "unavailable",
        current: "0.2.0",
        reason: "offline",
      }),
    ).toMatch(/Could not reach GitHub/);
  });
});
