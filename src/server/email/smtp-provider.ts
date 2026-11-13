import "server-only";

import { randomUUID } from "node:crypto";

import { createTransport } from "nodemailer";

import type {
  EmailDeliveryResult,
  EmailProvider,
  TransactionalEmail,
} from "./email-provider";

// D-3 (2026-11-13): transactional email goes through the domain's own SMTP
// host. Port 587 uses mandatory STARTTLS (requireTLS); 465 uses implicit TLS.

export type SmtpConfig = Readonly<{
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}>;

type SmtpMessage = Readonly<{
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}>;

export type SmtpSendMail = (
  message: SmtpMessage,
) => Promise<{ messageId?: string }>;

export function createSmtpSendMail(config: SmtpConfig): SmtpSendMail {
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { minVersion: "TLSv1.2" },
  });
  return (message) => transporter.sendMail(message);
}

// The same correlation id produces the same Message-ID, so a retried send is
// recognisable as one message by receiving servers.
export function smtpMessageId(correlationId: string, from: string) {
  const domain = /@([^>\s]+)>?\s*$/.exec(from)?.[1] ?? "localhost";
  const safeId = correlationId.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100);
  return `<${safeId}@${domain}>`;
}

const configurationCodes = new Set([
  "EAUTH",
  "ENOAUTH",
  "ECONFIG",
  "ETLS",
  "EREQUIRETLS",
]);
const transientCodes = new Set([
  "ECONNECTION",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
  "EPROTOCOL",
]);

export function classifySmtpError(error: unknown): EmailDeliveryResult {
  const details =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; responseCode?: unknown })
      : {};
  const code = typeof details.code === "string" ? details.code : "";
  const responseCode =
    typeof details.responseCode === "number" ? details.responseCode : null;
  const fail = (
    reason: "CONFIGURATION" | "RATE_LIMITED" | "UNAVAILABLE" | "REJECTED",
    retryable: boolean,
  ): EmailDeliveryResult => ({
    ok: false,
    provider: "SMTP",
    code: reason,
    retryable,
  });
  if (configurationCodes.has(code)) return fail("CONFIGURATION", false);
  if (responseCode !== null && responseCode >= 500)
    return fail("REJECTED", false);
  if (responseCode === 450 || responseCode === 451 || responseCode === 452)
    return fail("RATE_LIMITED", true);
  if (responseCode !== null && responseCode >= 400)
    return fail("UNAVAILABLE", true);
  if (code === "EENVELOPE") return fail("REJECTED", false);
  if (transientCodes.has(code)) return fail("UNAVAILABLE", true);
  return fail("UNAVAILABLE", true);
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "SMTP" as const;

  constructor(private readonly sendMail: SmtpSendMail) {}

  async send(message: TransactionalEmail): Promise<EmailDeliveryResult> {
    try {
      const info = await this.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        messageId: smtpMessageId(message.correlationId, message.from),
      });
      return {
        ok: true,
        provider: "SMTP",
        messageId: info.messageId ?? `smtp-${randomUUID()}`,
      };
    } catch (error: unknown) {
      return classifySmtpError(error);
    }
  }
}
