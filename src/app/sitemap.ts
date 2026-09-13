import type { MetadataRoute } from "next";

import { getServerEnv } from "@/lib/env/server";

export default function sitemap(): MetadataRoute.Sitemap {
  const env = getServerEnv();
  if (env.APP_ENV !== "production" || !env.MARKETING_INDEXING_ENABLED)
    return [];
  const base = env.NEXT_PUBLIC_APP_URL;
  return [
    "",
    "/product",
    "/product/brand-profile",
    "/product/website",
    "/product/social",
    "/product/ads",
    "/product/video",
    "/product/calendar",
    "/product/library",
    "/solutions/founders",
    "/solutions/marketing-teams",
    "/solutions/agencies",
    "/pricing",
    "/resources",
    "/resources/guides",
    "/resources/blog",
    "/about",
    "/contact",
    "/security",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly" as const,
    priority: path ? 0.5 : 1,
  }));
}
