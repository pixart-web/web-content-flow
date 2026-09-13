import type { MetadataRoute } from "next";

import { getServerEnv } from "@/lib/env/server";

type RobotsPolicy = {
  appEnv: "local" | "test" | "staging" | "production";
  indexingEnabled: boolean;
  applicationUrl: string;
};

export function createRobotsPolicy({
  appEnv,
  indexingEnabled,
  applicationUrl,
}: RobotsPolicy): MetadataRoute.Robots {
  if (appEnv !== "production" || !indexingEnabled)
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/product",
          "/solutions",
          "/resources",
          "/pricing",
          "/about",
          "/contact",
          "/security",
          "/legal",
        ],
        disallow: [
          "/app/",
          "/api/",
          "/forgot-password",
          "/reset-password",
          "/health/",
        ],
      },
    ],
    sitemap: `${applicationUrl}/sitemap.xml`,
  };
}

export default function robots(): MetadataRoute.Robots {
  const env = getServerEnv();
  return createRobotsPolicy({
    appEnv: env.APP_ENV,
    indexingEnabled: env.MARKETING_INDEXING_ENABLED,
    applicationUrl: env.NEXT_PUBLIC_APP_URL,
  });
}
