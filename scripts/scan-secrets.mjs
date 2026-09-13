import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) =>
      !file.endsWith("pnpm-lock.yaml") &&
      file !== ".env.example" &&
      !file.startsWith("docs/"),
  );
const patterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:AUTH_SECRET|RESEND_API_KEY|DATABASE_URL)\s*=\s*(?!.*(?:example|test|placeholder|ci-only))/,
];
const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (patterns.some((pattern) => pattern.test(text))) findings.push(file);
}
if (findings.length) {
  console.error(`Potential secrets found: ${findings.join(", ")}`);
  process.exit(1);
}
console.warn(`Secret scan passed for ${files.length} tracked files.`);
