import { LegalPage } from "@/components/shared/legal-page";
import { getRolloutPolicy } from "@/server/launch/rollout";

export default function StatusPage() {
  const rollout = getRolloutPolicy();
  return (
    <LegalPage title="Service status">
      <p>
        Launch state: <strong>{rollout.state.replaceAll("_", " ")}</strong>
      </p>
      <p>
        This page reports configured launch availability only. It is not a
        historical uptime or incident-status service.
      </p>
    </LegalPage>
  );
}
