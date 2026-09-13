import type { Metadata } from "next";
import Link from "next/link";

import { EditorialIndex } from "@/components/marketing/content-pages";
import { Section } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Practical resources for building a connected content operation.",
  alternates: { canonical: "/resources" },
};
export default function ResourcesPage() {
  return (
    <EditorialIndex
      eyebrow="RESOURCES"
      title="A clearer way to build content systems."
      copy="Guides and product notes will focus on strategy, brand consistency, structured generation and practical content operations."
    >
      <Section>
        <div className="feature-grid">
          <Link className="feature-card" href="/resources/guides">
            <h2>Guides</h2>
            <p>Practical, durable guidance for connected content workflows.</p>
          </Link>
          <Link className="feature-card" href="/resources/blog">
            <h2>Product journal</h2>
            <p>
              Thoughtful updates on product decisions and the private-beta path.
            </p>
          </Link>
        </div>
      </Section>
    </EditorialIndex>
  );
}
