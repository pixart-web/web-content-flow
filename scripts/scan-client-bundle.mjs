import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = ".next/static";
const prohibited = [
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "AUTH_SECRET",
  "RATE_LIMIT_SECRET",
  "DATABASE_URL",
];
const findings = [];
function visit(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) visit(path);
    else {
      const text = readFileSync(path, "utf8");
      if (prohibited.some((value) => text.includes(value))) findings.push(path);
    }
  }
}
visit(root);
if (findings.length) {
  console.error(
    `Server secret identifiers found in client output: ${findings.join(", ")}`,
  );
  process.exit(1);
}
console.warn("Client bundle secret scan passed.");
