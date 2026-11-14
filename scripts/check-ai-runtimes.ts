import "./local-node-env";

import { getServerEnv } from "../src/lib/env/server";
import { probeConfiguredRuntimes } from "../src/server/ai/gateway/runtime-health";

// C-03: `pnpm ai:health` — is each configured local/self-hosted runtime up and
// serving its model? Exit 1 when a configured runtime is not "ok".

async function main() {
  const results = await probeConfiguredRuntimes(getServerEnv());
  for (const health of results)
    console.warn(
      [
        health.runtimeKey.padEnd(18),
        health.status.padEnd(15),
        health.model ?? "—",
        health.latencyMs === null ? "" : `${health.latencyMs} ms`,
        health.detail ?? "",
        health.status === "model_missing"
          ? `available: ${health.availableModels.join(", ") || "none"}`
          : "",
      ]
        .filter(Boolean)
        .join("  "),
    );
  process.exitCode = results.some(
    (health) => health.status !== "ok" && health.status !== "not_configured",
  )
    ? 1
    : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
