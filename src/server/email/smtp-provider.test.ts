import { createServer, type Server } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  classifySmtpError,
  createSmtpSendMail,
  SmtpEmailProvider,
  smtpMessageId,
} from "./smtp-provider";

const message = {
  to: "person@example.test",
  from: "Web Content Flow <noreply@webcontentflow.com>",
  subject: "Reset your password",
  text: "text",
  html: "<p>html</p>",
  templateKey: "password-reset",
  correlationId: "corr_123",
};

describe("SmtpEmailProvider", () => {
  it("sends with a deterministic Message-ID derived from the correlation id", async () => {
    const sendMail = vi.fn(async () => ({ messageId: "<server-id>" }));
    const result = await new SmtpEmailProvider(sendMail).send(message);
    expect(result).toEqual({
      ok: true,
      provider: "SMTP",
      messageId: "<server-id>",
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "person@example.test",
        messageId: "<corr_123@webcontentflow.com>",
      }),
    );
  });

  it("returns a classified failure instead of throwing", async () => {
    const provider = new SmtpEmailProvider(async () => {
      throw Object.assign(new Error("Invalid login"), { code: "EAUTH" });
    });
    await expect(provider.send(message)).resolves.toEqual({
      ok: false,
      provider: "SMTP",
      code: "CONFIGURATION",
      retryable: false,
    });
  });
});

describe("classifySmtpError", () => {
  it.each([
    [{ code: "EAUTH" }, "CONFIGURATION", false],
    [{ code: "ETLS" }, "CONFIGURATION", false],
    [{ code: "ECONNECTION" }, "UNAVAILABLE", true],
    [{ code: "ETIMEDOUT" }, "UNAVAILABLE", true],
    [{ responseCode: 451 }, "RATE_LIMITED", true],
    [{ responseCode: 421 }, "UNAVAILABLE", true],
    [{ responseCode: 550 }, "REJECTED", false],
    [{ code: "EENVELOPE" }, "REJECTED", false],
  ])("%o → %s", (error, code, retryable) => {
    expect(classifySmtpError(error)).toMatchObject({ code, retryable });
  });
});

describe("smtpMessageId", () => {
  it("uses the sender domain and strips unsafe characters", () => {
    expect(smtpMessageId("a b<c>", "noreply@webcontentflow.com")).toBe(
      "<a-b-c-@webcontentflow.com>",
    );
  });
});

describe("createSmtpSendMail (real SMTP dialogue)", () => {
  let server: Server | undefined;
  afterEach(() => {
    server?.close();
  });

  it("refuses to authenticate when the server does not offer STARTTLS", async () => {
    const received: string[] = [];
    server = createServer((socket) => {
      socket.write("220 test.local ESMTP\r\n");
      socket.on("data", (chunk) => {
        const line = chunk.toString();
        received.push(line);
        if (/^EHLO/i.test(line))
          socket.write("250-test.local\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (/^STARTTLS/i.test(line))
          socket.write("502 5.5.1 STARTTLS not available\r\n");
        else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      });
    });
    await new Promise<void>((resolve) => server!.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    const sendMail = createSmtpSendMail({
      host: "127.0.0.1",
      port,
      secure: false,
      user: "noreply@webcontentflow.com",
      password: "not-a-real-password",
    });
    const result = await new SmtpEmailProvider(sendMail).send(message);
    expect(result).toMatchObject({ ok: false, code: "CONFIGURATION" });
    expect(received.join("")).not.toMatch(/AUTH/i);
    expect(received.join("")).not.toContain("not-a-real-password");
  });
});
