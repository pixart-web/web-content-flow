import { LegalPage } from "@/components/shared/legal-page";

export default function HelpPage() {
  return (
    <LegalPage title="Help">
      <h2>Generation</h2>
      <p>
        Jobs remain durable while you navigate. A partial failure leaves
        successful content usable. Retry only the failed scope where offered.
      </p>
      <h2>Usage limits</h2>
      <p>
        Real-provider attempts, retries and repairs count toward the displayed
        allowance. Deterministic mock generation does not.
      </p>
      <h2>Exports and publishing</h2>
      <p>
        Exports use saved versions and expire. Scheduled or published Calendar
        statuses are manual planning records; no external publishing occurs.
      </p>
      <h2>Account access</h2>
      <p>Use password recovery from the sign-in page or contact support.</p>
    </LegalPage>
  );
}
