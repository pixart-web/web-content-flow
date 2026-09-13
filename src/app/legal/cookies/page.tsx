import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies",
  description: "How Web Content Flow uses cookies.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <main className="legal-reading">
      <article className="legal-content">
        <Link href="/">← Web Content Flow</Link>
        <h1>Cookie policy</h1>
        <p>
          The current application uses necessary cookies to maintain secure
          authenticated sessions.
        </p>
        <h2>Optional measurement</h2>
        <p>
          Advertising trackers are not installed. Privacy-conscious marketing
          analytics remains inactive unless a provider and appropriate consent
          mechanism are explicitly configured.
        </p>
      </article>
    </main>
  );
}
