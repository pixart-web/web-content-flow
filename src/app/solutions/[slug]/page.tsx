import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SolutionPage } from "@/components/marketing/content-pages";
import { solutions } from "@/content/marketing";

type SolutionSlug = keyof typeof solutions;
export function generateStaticParams() {
  return Object.keys(solutions).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = solutions[slug as SolutionSlug];
  return solution
    ? {
        title: solution.label,
        description: solution.summary,
        alternates: { canonical: `/solutions/${slug}` },
      }
    : {};
}

export default async function AudienceSolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(slug in solutions)) notFound();
  return <SolutionPage slug={slug as SolutionSlug} />;
}
