import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function getGenerationAvailability() {
  const env = getServerEnv();
  return {
    mockAvailable: env.NODE_ENV !== "production",
    realAvailable: env.AI_REAL_GENERATION_ENABLED,
    provider: env.AI_REAL_GENERATION_ENABLED ? ("OPENAI" as const) : null,
    defaultMode:
      env.AI_PROVIDER_DEFAULT === "OPENAI" && env.AI_REAL_GENERATION_ENABLED
        ? ("REAL" as const)
        : ("MOCK" as const),
  };
}
