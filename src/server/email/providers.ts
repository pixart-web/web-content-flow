import "server-only";

import { randomUUID } from "node:crypto";

import { getServerEnv } from "@/lib/env/server";

import type {
  EmailDeliveryResult,
  EmailProvider,
  TransactionalEmail,
} from "./email-provider";

class MockEmailProvider implements EmailProvider {
  readonly name = "MOCK" as const;

  async send(message: TransactionalEmail): Promise<EmailDeliveryResult> {
    const result = {
      ok: true,
      provider: "MOCK",
      messageId: `mock-${randomUUID()}`,
    } as const;
    if (process.env.NODE_ENV === "test")
      capturedTestEmails.push({ ...message, result });
    return result;
  }
}

const capturedTestEmails: {
  to: string;
  subject: string;
  text: string;
  html: string;
  templateKey: string;
  correlationId: string;
  result: EmailDeliveryResult;
}[] = [];

export function getCapturedTestEmails() {
  if (process.env.NODE_ENV !== "test") return [];
  return capturedTestEmails.map((entry) => ({ ...entry }));
}

export function clearCapturedTestEmails() {
  if (process.env.NODE_ENV === "test") capturedTestEmails.length = 0;
}

export async function sendTransactionalEmailSafely(
  message: TransactionalEmail,
) {
  let last: EmailDeliveryResult | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      last = await getEmailProvider().send(message);
    } catch {
      last = {
        ok: false,
        provider: getServerEnv().EMAIL_PROVIDER,
        code: "CONFIGURATION",
        retryable: false,
      };
    }
    if (last.ok || !last.retryable) break;
  }
  if (!last?.ok)
    console.error(
      JSON.stringify({
        event: "transactional_email.failed",
        templateKey: message.templateKey,
        correlationId: message.correlationId,
        code: last?.code ?? "UNAVAILABLE",
      }),
    );
  return last;
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "RESEND" as const;

  constructor(private readonly apiKey: string) {}

  async send(message: TransactionalEmail): Promise<EmailDeliveryResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.correlationId,
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const body = (await response.json()) as { id?: unknown };
        return {
          ok: true,
          provider: "RESEND",
          messageId:
            typeof body.id === "string" ? body.id : `resend-${randomUUID()}`,
        };
      }
      return {
        ok: false,
        provider: "RESEND",
        code:
          response.status === 429
            ? "RATE_LIMITED"
            : response.status >= 500
              ? "UNAVAILABLE"
              : "REJECTED",
        retryable: response.status === 429 || response.status >= 500,
      };
    } catch {
      return {
        ok: false,
        provider: "RESEND",
        code: "UNAVAILABLE",
        retryable: true,
      };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const env = getServerEnv();
  if (env.EMAIL_PROVIDER === "MOCK") return new MockEmailProvider();
  if (!env.RESEND_API_KEY)
    throw new Error("Transactional email is not configured.");
  return new ResendEmailProvider(env.RESEND_API_KEY);
}
