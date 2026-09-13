import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/marketing/content-pages";
import { productStories } from "@/content/marketing";
import type { ProductMediaId } from "@/content/product-media";

const mediaBySlug = {
  "brand-profile": "brief-to-brand",
  website: "website-generation",
  social: "social-studio",
  ads: "ads-creative",
  video: "video-scripts",
  calendar: "calendar-planning",
  library: "library-export",
} as const satisfies Record<string, ProductMediaId>;

export function generateStaticParams() {
  return productStories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = productStories.find((entry) => entry.slug === slug);
  if (!story) return {};
  return {
    title: story.name,
    description: story.description,
    alternates: { canonical: `/product/${slug}` },
  };
}

export default async function ProductModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = productStories.find((entry) => entry.slug === slug);
  const mediaId = mediaBySlug[slug as keyof typeof mediaBySlug];
  if (!story || !mediaId) notFound();
  return <ProductDetailPage {...story} mediaId={mediaId} />;
}
