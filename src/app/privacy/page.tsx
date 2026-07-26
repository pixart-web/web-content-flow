import { LegalPage } from "@/components/shared/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice — draft for legal review">
      <p>
        This launch placeholder describes the implemented data flows and is not
        final legal advice. Public launch is blocked until approved legal text
        replaces it.
      </p>
      <h2>Data handled</h2>
      <p>
        The service stores account identity, project Briefs, Brand Profiles,
        generated and edited content versions, usage records and temporary
        exports. Necessary authentication cookies maintain sessions.
      </p>
      <h2>AI providers and exports</h2>
      <p>
        Real generation transfers the necessary project context to the
        configured AI provider. Mock mode does not. Exports contain selected
        validated versions and expire after the configured retention window.
      </p>
      <h2>Deletion and retention</h2>
      <p>
        Self-service account deletion is not enabled for launch. Contact support
        for a reviewed deletion request. Operational and legal retention
        exceptions require final legal approval.
      </p>
    </LegalPage>
  );
}
