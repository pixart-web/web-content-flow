import { LegalPage } from "@/components/shared/legal-page";

export default function SecurityPage() {
  return (
    <LegalPage title="Security">
      <p>
        Web Content Flow enforces server-side project ownership, hashed
        passwords and reset tokens, private database sessions, validated
        structured outputs, immutable versions, bounded jobs and private
        time-limited exports.
      </p>
      <p>
        No security certification is claimed. Report suspected security issues
        through the contact page without including passwords, API keys or
        customer content.
      </p>
    </LegalPage>
  );
}
