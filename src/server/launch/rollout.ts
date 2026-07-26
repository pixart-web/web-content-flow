import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function getRolloutPolicy() {
  const env = getServerEnv();
  const maintenance = env.ROLLOUT_STATE === "MAINTENANCE";
  const registrationAvailable =
    env.PUBLIC_REGISTRATION_ENABLED &&
    (env.ROLLOUT_STATE === "PUBLIC" ||
      env.APP_ENV === "local" ||
      env.APP_ENV === "test") &&
    !maintenance;

  return {
    appEnvironment: env.APP_ENV,
    state: env.ROLLOUT_STATE,
    maintenance,
    registrationAvailable,
    requestAccess: env.ROLLOUT_STATE === "INVITE_ONLY",
    exportsEnabled: env.EXPORTS_ENABLED && !maintenance,
    projectPackageExportEnabled:
      env.PROJECT_PACKAGE_EXPORT_ENABLED && !maintenance,
    publicPricing: env.PUBLIC_PRICING_ENABLED,
  } as const;
}
