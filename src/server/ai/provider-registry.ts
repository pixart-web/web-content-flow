import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function getGenerationAvailability() {
  const env = getServerEnv();
  return {
    mockAvailable: env.NODE_ENV !== "production",
    realAvailable: env.AI_REAL_GENERATION_ENABLED,
    provider:
      env.AI_REAL_GENERATION_ENABLED && env.AI_PROVIDER_DEFAULT !== "MOCK"
        ? env.AI_PROVIDER_DEFAULT
        : null,
    defaultMode:
      env.AI_PROVIDER_DEFAULT !== "MOCK" && env.AI_REAL_GENERATION_ENABLED
        ? ("REAL" as const)
        : ("MOCK" as const),
  };
}
