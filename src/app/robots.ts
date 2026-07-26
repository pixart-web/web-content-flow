import type { MetadataRoute } from "next";

import { getServerEnv } from "@/lib/env/server";

export default function robots(): MetadataRoute.Robots {
  const env = getServerEnv();
  if (env.APP_ENV !== "production")
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms", "/security", "/help"],
        disallow: [
          "/app/",
          "/api/",
          "/forgot-password",
          "/reset-password",
          "/health/",
        ],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
