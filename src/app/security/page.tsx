import type { Metadata } from "next";

import {
  MarketingPage,
  Section,
  SectionHeader,
} from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Implemented security controls and operational verification status for Web Content Flow.",
  alternates: { canonical: "/security" },
};

const controls = [
  [
    "Authentication",
    "Database sessions, Argon2id password hashing and server-side session validation are implemented and locally verified.",
  ],
  [
    "Authorisation",
    "Project and content access is checked through owner-scoped server queries. Missing and unauthorised resources return neutral responses.",
  ],
  [
    "Content safety",
    "Generated content is treated as untrusted text. Arbitrary generated HTML is not rendered.",
  ],
  [
    "Secrets",
    "Server variables are validated and excluded from client bundles. Repository and bundle secret scans run in CI.",
  ],
  [
    "Provenance",
    "Generated versions retain provider, schema, prompt and Brand Profile provenance.",
  ],
  [
    "Operations",
    "Health checks, worker leases, incident runbooks and backup procedures exist. External staging monitoring, PITR and restore evidence remain unverified.",
  ],
] as const;

export default function SecurityPage() {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">SECURITY</p>
          <h1>Clear controls. Honest verification.</h1>
          <p className="lead">
            This page distinguishes implemented application safeguards from
            operational controls that still require external staging evidence.
          </p>
        </div>
      </section>
      <Section>
        <SectionHeader
          title="Current safeguards"
          copy="No certification, guaranteed retention policy or external operational maturity is implied."
        />
        <div className="feature-grid">
          {controls.map(([title, copy]) => (
            <article className="feature-card" key={title}>
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
    </MarketingPage>
  );
}
