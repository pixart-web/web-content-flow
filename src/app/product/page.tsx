import type { Metadata } from "next";

import {
  BetaCta,
  MarketingPage,
  Section,
  SectionHeader,
} from "@/components/marketing/marketing-shell";
import { FlowDiagram, ProductMockup } from "@/components/marketing/visuals";

export const metadata: Metadata = {
  title: "Product",
  description:
    "A connected system for the complete content workflow, from Brief and Brand Profile to Calendar, Library and Export.",
  alternates: { canonical: "/product" },
};

export default function ProductPage() {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">PRODUCT</p>
          <h1>A connected system for your complete content workflow.</h1>
          <p className="lead">
            Move from strategic foundation to channel-ready drafts, retained
            versions, a visible plan and structured exports.
          </p>
        </div>
      </section>
      <Section>
        <FlowDiagram />
      </Section>
      <Section>
        <div className="hero-grid">
          <SectionHeader
            eyebrow="STRUCTURED WORK"
            title="Every output keeps its place in the system."
            copy="Generated content remains editable, versioned and connected to the Brand Profile that shaped it."
          />
          <ProductMockup name="Content Library" />
        </div>
      </Section>
      <BetaCta />
    </MarketingPage>
  );
}
