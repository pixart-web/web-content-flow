import { LegalPage } from "@/components/shared/legal-page";
import { getServerEnv } from "@/lib/env/server";

export default function ContactPage() {
  const email = getServerEnv().SUPPORT_EMAIL;
  return (
    <LegalPage title="Contact and launch access">
      <p>
        Email{" "}
        <a className="text-link underline" href={`mailto:${email}`}>
          {email}
        </a>
        . Do not include passwords, API keys, reset links or full project
        content.
      </p>
      <p>
        Support is provided during available working hours; 24/7 coverage is not
        claimed.
      </p>
    </LegalPage>
  );
}
