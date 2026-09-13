import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BetaCta,
  MarketingPage,
  Section,
  SectionHeader,
} from "@/components/marketing/marketing-shell";
import {
  ContentConstellation,
  FlowDiagram,
} from "@/components/marketing/visuals";
import { ProductMedia } from "@/components/marketing/product-media";
import { productStories, solutions } from "@/content/marketing";
import { productMedia } from "@/content/product-media";

export const metadata: Metadata = {
  title: "Content operations platform",
  description:
    "Turn one strategic brief into a connected system of brand-consistent website, social, campaign, video and calendar content.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Web Content Flow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A content operations platform that turns one strategic brief into a connected marketing-content system.",
  };

  return (
    <MarketingPage>
      <script type="application/ld+json">
        {JSON.stringify(structuredData).replaceAll("<", "\\u003c")}
      </script>
      <section className="marketing-hero">
        <div className="marketing-container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">THE CONTENT OPERATIONS PLATFORM</p>
            <h1>From one brief to your entire content system.</h1>
            <p className="lead">
              Shape your brand, website, social content, campaigns, video ideas
              and publishing calendar through one connected workflow.
            </p>
            <div className="button-row">
              <Link className="marketing-button" href="/contact">
                Join the private beta <ArrowRight aria-hidden size={18} />
              </Link>
              <Link className="marketing-button secondary" href="#workflow">
                Watch the workflow
              </Link>
            </div>
            <p className="support-note">
              Built for founders and small marketing teams.
            </p>
          </div>
          <ContentConstellation />
        </div>
      </section>

      <div
        className="marketing-container principle-row"
        aria-label="Product principles"
      >
        {[
          "Brand-aware",
          "Versioned",
          "Structured",
          "Editable",
          "Exportable",
        ].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <Section>
        <p className="eyebrow">A CONNECTED FOUNDATION</p>
        <h2 className="editorial-statement">
          Your marketing should not start from zero every Monday.
        </h2>
        <div className="before-after" style={{ marginTop: "4rem" }}>
          <article className="comparison-card">
            <h3>Disconnected work</h3>
            <ul>
              {[
                "Scattered documents",
                "Repeated prompts",
                "Inconsistent tone",
                "Lost revisions",
                "Separate planning",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="comparison-card connected">
            <h3>One content system</h3>
            <ul>
              {[
                "Start from one brief",
                "Reuse one brand foundation",
                "Create through one workflow",
                "Keep versions connected",
                "Plan in one calendar",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      <Section id="workflow">
        <SectionHeader
          eyebrow="THE COMPLETE FLOW"
          title="One workflow. Every essential channel."
          copy="Each step uses the strategic context that came before it. The result is structured content, not a collection of disconnected chat transcripts."
        />
        <FlowDiagram />
      </Section>

      <Section>
        <div className="hero-grid">
          <div>
            <SectionHeader
              eyebrow="ONE SOURCE OF TRUTH"
              title="Your brand context stays with the work."
              copy="Define the strategy, audience, positioning and voice once. Web Content Flow carries that foundation into every connected content module."
            />
            <Link
              className="marketing-button secondary"
              href="/product/brand-profile"
            >
              Explore the Brand Profile
            </Link>
          </div>
          <ProductMedia media={productMedia["brief-to-brand"]} />
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="CHANNEL-READY WORK"
          title="Turn one direction into structured outputs."
          copy="Every module follows the same pattern: inherited context, validated structure, editable content and retained versions."
        />
        <div className="feature-grid">
          {productStories.slice(1, 6).map((story) => (
            <article className="feature-card" key={story.slug}>
              <p className="eyebrow">{story.eyebrow}</p>
              <h3>{story.title}</h3>
              <p
                style={{
                  color: "var(--marketing-secondary)",
                  lineHeight: 1.65,
                }}
              >
                {story.description}
              </p>
              <Link className="text-action" href={`/product/${story.slug}`}>
                Explore {story.name}
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="FOR FOCUSED TEAMS"
          title="Built for teams that need momentum, not more tools."
        />
        <div className="audience-grid">
          {Object.entries(solutions).map(([slug, solution]) => (
            <article className="audience-card" key={slug}>
              <p className="eyebrow">{solution.label}</p>
              <h3>{solution.title}</h3>
              <p>{solution.summary}</p>
              <Link href={`/solutions/${slug}`}>See the workflow</Link>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="HUMAN JUDGMENT"
          title="Creative control stays with you."
          copy="Web Content Flow creates structured drafts and preserves their history. It does not replace review, factual verification or publishing decisions."
        />
        <div className="feature-grid">
          {[
            [
              "Drafts, not final truth",
              "Treat generated work as a strong starting point that still needs informed review.",
            ],
            [
              "Editable at every stage",
              "Make explicit changes without losing the previous saved version.",
            ],
            [
              "Visible provenance",
              "Understand which Brand Profile version and generation job shaped the content.",
            ],
            [
              "Review before publishing",
              "Publishing remains a deliberate human action outside the platform.",
            ],
          ].map(([title, copy]) => (
            <article className="principle-card" key={title}>
              <h3>{title}</h3>
              <p
                style={{
                  color: "var(--marketing-secondary)",
                  lineHeight: 1.65,
                }}
              >
                {copy}
              </p>
            </article>
          ))}
        </div>
      </Section>
      <BetaCta />
    </MarketingPage>
  );
}
