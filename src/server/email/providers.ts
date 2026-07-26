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

  async send(): Promise<EmailDeliveryResult> {
    return {
      ok: true,
      provider: "MOCK",
      messageId: `mock-${randomUUID()}`,
    };
  }
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
