import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { resolvePlanPolicy } from "@/server/plans/plan-policy";

export default async function UsageSettingsPage() {
  const user = await requireUser("/app/settings/usage");
  const account = await getPrisma().user.findUniqueOrThrow({
    where: { id: user.id },
    select: { plan: true },
  });
  const policy = resolvePlanPolicy(account.plan);
  if (!policy) throw new Error("Unknown plan.");
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const usage = await getPrisma().generationUsage.aggregate({
    where: { userId: user.id, provider: "OPENAI", createdAt: { gte: start } },
    _sum: { totalTokens: true },
    _count: true,
  });
  const active = await getPrisma().generationJob.count({
    where: {
      project: { userId: user.id },
      mode: "REAL",
      status: {
        in: ["PREPARING", "QUEUED", "RUNNING", "VALIDATING", "SAVING"],
      },
    },
  });
  const tokens = usage._sum.totalTokens ?? 0;
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Usage</h1>
      <p className="text-secondary mt-3">
        Provider-reported and estimated real-generation usage for the current
        calendar month. Mock generation is excluded.
      </p>
      <dl className="mt-7 grid gap-4 sm:grid-cols-2">
        {[
          ["Plan", policy.label],
          ["Real-generation tokens", tokens.toLocaleString()],
          ["Monthly allowance", policy.monthlyRealTokens.toLocaleString()],
          [
            "Remaining allowance",
            Math.max(0, policy.monthlyRealTokens - tokens).toLocaleString(),
          ],
          ["Active real jobs", String(active)],
          ["Recorded attempts", String(usage._count)],
          [
            "Export size limit",
            `${Math.floor(policy.exportMaxBytes / 1_000_000)} MB`,
          ],
          ["Export retention", `${policy.exportRetentionHours} hours`],
        ].map(([label, value]) => (
          <div
            className="border-default bg-surface rounded-card border p-5"
            key={label}
          >
            <dt className="text-secondary text-sm">{label}</dt>
            <dd className="mt-2 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-secondary mt-5 text-sm">
        Usage may lag briefly while a provider attempt is reconciled. Retries
        and structural repairs are counted.
      </p>
    </div>
  );
}
