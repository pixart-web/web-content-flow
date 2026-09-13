import Link from "next/link";

import { solutions } from "@/content/marketing";
import { productMedia, type ProductMediaId } from "@/content/product-media";
import {
  BetaCta,
  MarketingPage,
  Section,
  SectionHeader,
} from "./marketing-shell";
import { ProductMedia } from "./product-media";

export function ProductDetailPage({
  eyebrow,
  title,
  description,
  name,
  mediaId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  name: string;
  mediaId: ProductMediaId;
}) {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead">{description}</p>
        </div>
      </section>
      <Section>
        <div className="hero-grid">
          <div>
            <SectionHeader
              eyebrow="CONNECTED BY DESIGN"
              title="Strategy remains visible at every step."
              copy={`The ${name} workflow uses the current Brand Profile for new generation, validates structured output and preserves each explicit save or regeneration as a version.`}
            />
            <ul style={{ color: "var(--marketing-secondary)", lineHeight: 2 }}>
              <li>Structured, labelled fields</li>
              <li>Explicit editing and regeneration</li>
              <li>Immutable version history</li>
              <li>Brand Profile provenance</li>
            </ul>
          </div>
          <ProductMedia media={productMedia[mediaId]} />
        </div>
      </Section>
      <BetaCta />
    </MarketingPage>
  );
}

export function SolutionPage({ slug }: { slug: keyof typeof solutions }) {
  const solution = solutions[slug];
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">{solution.label}</p>
          <h1>{solution.title}</h1>
          <p className="lead">{solution.summary}</p>
          <div className="button-row">
            <Link className="marketing-button" href="/contact">
              Join the private beta
            </Link>
            <Link className="marketing-button secondary" href="/product">
              Explore the product
            </Link>
          </div>
        </div>
      </section>
      <Section>
        <SectionHeader
          eyebrow="OUTCOMES"
          title="A calmer path from direction to delivery."
        />
        <div className="feature-grid">
          {solution.outcomes.map((outcome, index) => (
            <article className="feature-card" key={outcome}>
              <p className="eyebrow">0{index + 1}</p>
              <h3>{outcome}</h3>
              <p
                style={{
                  color: "var(--marketing-secondary)",
                  lineHeight: 1.65,
                }}
              >
                Build on shared context instead of recreating the same strategic
                work for every channel.
              </p>
            </article>
          ))}
        </div>
      </Section>
      <BetaCta />
    </MarketingPage>
  );
}

export function EditorialIndex({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead">{copy}</p>
        </div>
      </section>
      {children}
    </MarketingPage>
  );
}
