import Link from "next/link";

import { getRolloutPolicy } from "@/server/launch/rollout";
import { resolvePlanPolicy } from "@/server/plans/plan-policy";

export default function PricingPage() {
  const rollout = getRolloutPolicy();
  const plan = resolvePlanPolicy("FREE")!;
  return (
    <main className="bg-canvas min-h-screen px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <Link className="text-link text-sm underline" href="/">
          Web Content Flow
        </Link>
        <h1 className="font-display mt-6 text-4xl font-semibold">
          Controlled launch access
        </h1>
        <p className="text-secondary mt-4 max-w-prose">
          Billing and self-service upgrades are not implemented. Access is
          currently provided under the launch policy below.
        </p>
        <section className="border-default bg-surface rounded-panel mt-8 border p-7">
          <h2 className="font-display text-2xl font-semibold">{plan.label}</h2>
          <p className="text-secondary mt-2">
            No payment checkout is available during the controlled launch.
          </p>
          <ul className="mt-6 list-disc space-y-2 pl-5">
            <li>Up to {plan.projectLimit} projects</li>
            <li>
              {plan.monthlyRealTokens.toLocaleString()} real-generation tokens
              per month
            </li>
            <li>Text, Markdown, JSON and compatible CSV exports</li>
            <li>No direct platform publishing</li>
          </ul>
          <Link
            className="bg-action-primary text-inverse rounded-control mt-7 inline-flex min-h-11 items-center px-5 font-semibold"
            href={
              rollout.registrationAvailable
                ? "/sign-up"
                : rollout.requestAccess
                  ? "/contact"
                  : "/sign-in"
            }
          >
            {rollout.registrationAvailable
              ? "Create account"
              : rollout.requestAccess
                ? "Request access"
                : "Sign in"}
          </Link>
        </section>
      </div>
    </main>
  );
}
