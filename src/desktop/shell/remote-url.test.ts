import { describe, expect, it } from "vitest";

import { probeRemoteServer, validateRemoteServerUrl } from "./remote-url";

describe("private server address (L7)", () => {
  it("accepts https origins only, without credentials", () => {
    expect(
      validateRemoteServerUrl(" https://wcf.example.com/app/x?y=1 ")?.href,
    ).toBe("https://wcf.example.com/");
    for (const bad of [
      "http://wcf.example.com",
      "https://user:pass@wcf.example.com",
      "ftp://wcf.example.com",
      "not a url",
    ])
      expect(validateRemoteServerUrl(bad)).toBeNull();
  });

  it("reports reachable servers, wrong servers and network failures", async () => {
    const url = new URL("https://wcf.example.com");
    const ok = (async () =>
      new Response("ok", { status: 200 })) as typeof fetch;
    const notFound = (async () =>
      new Response("", { status: 404 })) as typeof fetch;
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    expect(await probeRemoteServer(url, ok)).toEqual({ ok: true });
    expect(await probeRemoteServer(url, notFound)).toEqual({
      ok: false,
      reason: "not_web_content_flow",
    });
    expect(await probeRemoteServer(url, down)).toEqual({
      ok: false,
      reason: "unreachable",
    });
  });
});
