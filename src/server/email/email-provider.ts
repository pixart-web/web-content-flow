import "server-only";

export type TransactionalEmail = Readonly<{
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  templateKey: string;
  correlationId: string;
}>;

export type EmailDeliveryResult =
  | { ok: true; provider: "MOCK" | "RESEND" | "SMTP"; messageId: string }
  | {
      ok: false;
      provider: "MOCK" | "RESEND" | "SMTP";
      code: "CONFIGURATION" | "RATE_LIMITED" | "UNAVAILABLE" | "REJECTED";
      retryable: boolean;
    };

export interface EmailProvider {
  readonly name: "MOCK" | "RESEND" | "SMTP";
  send(message: TransactionalEmail): Promise<EmailDeliveryResult>;
}
