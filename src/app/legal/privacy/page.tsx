import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Web Content Flow privacy information.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="legal-reading">
      <article className="legal-content">
        <Link href="/">← Web Content Flow</Link>
        <h1>Privacy</h1>
        <p>
          Web Content Flow stores account identity, project briefs, Brand
          Profiles, generated and edited content versions, operational usage
          records and private-beta interest submissions required to provide and
          improve the service.
        </p>
        <h2>AI generation</h2>
        <p>
          When real generation is enabled, the necessary project context is sent
          to the configured AI provider. Mock mode makes no provider request.
        </p>
        <h2>Analytics and cookies</h2>
        <p>
          Necessary authentication cookies maintain signed-in sessions.
          Marketing analytics is disabled unless configured and must not receive
          generated content, passwords or private form responses.
        </p>
        <h2>Requests</h2>
        <p>
          Contact us through the contact page for access or deletion requests.
          Final retention periods and legal terms require review before public
          launch.
        </p>
      </article>
    </main>
  );
}
