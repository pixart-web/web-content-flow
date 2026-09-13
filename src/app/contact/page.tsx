import type { Metadata } from "next";

import { BetaForm } from "@/components/marketing/beta-form";
import { MarketingPage, Section } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Join the private beta",
  description: "Request early access to the Web Content Flow private beta.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingPage>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <p className="eyebrow">PRIVATE BETA</p>
          <h1>Help shape a more connected content workflow.</h1>
          <p className="lead">
            Tell us how you work today. Submitting this form records interest;
            it does not guarantee access or create an account.
          </p>
        </div>
      </section>
      <Section>
        <BetaForm />
      </Section>
    </MarketingPage>
  );
}
