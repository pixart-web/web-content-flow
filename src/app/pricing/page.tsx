import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPage, Section } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Private-beta plan structure for Web Content Flow. Permanent prices have not been announced.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">PRICING</p>
          <h1>Simple plans are coming with the private beta.</h1>
          <p className="lead">
            We are finalising usage limits, beta access and support options
            based on real operating costs and early-user feedback.
          </p>
          <div className="button-row">
            <Link className="marketing-button" href="/contact">
              Join the private beta
            </Link>
          </div>
        </div>
      </section>
      <Section>
        <article className="comparison-card connected">
          <p className="eyebrow">PLANNED PLAN STRUCTURE</p>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", marginTop: 0 }}>
            Designed around real usage.
          </h2>
          <div className="feature-grid">
            {[
              "Projects",
              "Monthly generations",
              "Export formats",
              "Team access",
              "Support level",
            ].map((dimension) => (
              <div className="feature-card" key={dimension}>
                <h3>{dimension}</h3>
                <p style={{ color: "var(--marketing-secondary)" }}>
                  Limits and availability will be confirmed before paid plans
                  launch.
                </p>
              </div>
            ))}
          </div>
        </article>
      </Section>
    </MarketingPage>
  );
}
