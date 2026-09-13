import { z } from "zod";

const absoluteUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      ((url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
        url.protocol === "http:")
    );
  });

export function passwordResetTemplate(input: {
  resetUrl: string;
  expiresMinutes: number;
}) {
  absoluteUrl.parse(input.resetUrl);
  const subject = "Reset your Web Content Flow password";
  const text = [
    "Web Content Flow",
    "",
    "Use this one-time link to reset your password:",
    input.resetUrl,
    "",
    `This link expires in ${input.expiresMinutes} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const escapedUrl = input.resetUrl
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
  const html = `<h1>Web Content Flow</h1><p>Use this one-time link to reset your password:</p><p><a href="${escapedUrl}">Reset password</a></p><p>This link expires in ${input.expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`;
  return {
    key: "auth.password-reset@1.0.0",
    subject,
    text,
    html,
  } as const;
}

export function passwordChangedTemplate() {
  return {
    key: "auth.password-changed@1.0.0",
    subject: "Your Web Content Flow password changed",
    text: "Your Web Content Flow password was changed. If this was not you, contact support.",
    html: "<h1>Web Content Flow</h1><p>Your password was changed. If this was not you, contact support.</p>",
  } as const;
}
