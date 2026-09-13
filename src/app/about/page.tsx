import type { Metadata } from "next";

import { MarketingPage, Section } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Web Content Flow exists and why content should move forward.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">ABOUT</p>
          <h1>Content should move forward.</h1>
          <p className="lead">
            Web Content Flow is a founder-led product built around clarity,
            consistency, craft and human judgment.
          </p>
        </div>
      </section>
      <Section>
        <article
          style={{
            maxWidth: 760,
            fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
            lineHeight: 1.7,
            color: "var(--marketing-secondary)",
          }}
        >
          <p>Marketing should not restart every Monday.</p>
          <p>
            Yet businesses keep returning to the same blank page. The same
            strategy is rewritten. The same brand guidance is copied. The same
            ideas are rebuilt for every channel.
          </p>
          <p>We believe content should move forward.</p>
          <p>
            One clear brief should shape a website. A campaign. A social
            presence. A video plan. A complete content calendar.
          </p>
          <p>
            Every asset should feel connected. Every channel should recognise
            the same brand. Every new idea should build on what already exists.
          </p>
          <p>
            Web Content Flow was created to turn isolated content into a working
            system.
          </p>
          <p>
            Not to replace creativity.
            <br />
            To give it direction.
          </p>
          <p>
            Not to fill more feeds.
            <br />
            To create work with purpose.
          </p>
          <p style={{ color: "var(--marketing-text)" }}>
            Create once.
            <br />
            Flow everywhere.
          </p>
        </article>
      </Section>
    </MarketingPage>
  );
}
