import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Web Content Flow service terms information.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <main className="legal-reading">
      <article className="legal-content">
        <Link href="/">← Web Content Flow</Link>
        <h1>Terms of service</h1>
        <p>
          Web Content Flow creates editable marketing-content drafts. It does
          not automatically publish, verify every factual claim, render final
          visual media or replace professional legal review.
        </p>
        <h2>User responsibility</h2>
        <p>
          Users remain responsible for reviewing generated content, factual
          claims, rights and regulatory suitability before publication.
        </p>
        <h2>Private-beta access</h2>
        <p>
          Submitting interest does not guarantee access. Availability, limits,
          support and future paid terms will be communicated before they apply.
        </p>
      </article>
    </main>
  );
}
