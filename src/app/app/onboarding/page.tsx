import { redirect } from "next/navigation";

import {
  continueOnboardingAction,
  skipCompletedOnboardingAction,
} from "@/features/onboarding/onboarding-actions";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";

export default async function OnboardingPage() {
  const user = await requireUser("/app/onboarding");
  const record = await getPrisma().user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      onboardingStep: true,
      onboardingCompletedAt: true,
      _count: { select: { projects: true } },
    },
  });
  if (record.onboardingCompletedAt) redirect("/app");

  return (
    <main className="mx-auto max-w-3xl">
      <header className="space-y-3">
        <p className="text-link text-sm font-semibold">
          Welcome · Step {Math.min(record.onboardingStep + 1, 8)} of 8
        </p>
        <h1 className="font-display text-3xl font-semibold">
          Create one connected content system
        </h1>
        <p className="text-secondary max-w-prose leading-7">
          Your first project starts with a guided Brief. Web Content Flow then
          creates an editable Brand Profile that becomes the source of truth for
          every selected module.
        </p>
      </header>

      <section className="border-default bg-surface rounded-panel mt-8 border p-6">
        <h2 className="font-display text-xl font-semibold">
          What happens next
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          <li>
            <strong>1. Complete the Brief</strong>
            <p className="text-secondary mt-1 text-sm">
              Required business, audience, objective and brand direction.
            </p>
          </li>
          <li>
            <strong>2. Review the Brand Profile</strong>
            <p className="text-secondary mt-1 text-sm">
              Inferred positioning and voice remain editable and versioned.
            </p>
          </li>
          <li>
            <strong>3. Choose what to generate</strong>
            <p className="text-secondary mt-1 text-sm">
              Generation starts only after your explicit action.
            </p>
          </li>
        </ol>
        <div className="border-default bg-surface-subtle rounded-control mt-6 border p-4 text-sm">
          Real generation sends the necessary project context to the configured
          AI provider. Mock mode makes no external AI request. Generated claims
          still require your factual review.
        </div>
        <form action={continueOnboardingAction} className="mt-6">
          <button className="bg-action-primary text-inverse rounded-control min-h-11 px-5 font-semibold">
            {record._count.projects
              ? "Resume project setup"
              : "Create first project"}
          </button>
        </form>
        {record._count.projects ? (
          <form action={skipCompletedOnboardingAction} className="mt-3">
            <button className="text-link min-h-11 text-sm font-semibold underline">
              Continue to my existing project
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
