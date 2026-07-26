import type { MetadataRoute } from "next";

import { getServerEnv } from "@/lib/env/server";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getServerEnv().NEXT_PUBLIC_APP_URL;
  return ["", "/pricing", "/privacy", "/terms", "/security", "/help"].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "monthly" as const,
      priority: path ? 0.5 : 1,
    }),
  );
}
