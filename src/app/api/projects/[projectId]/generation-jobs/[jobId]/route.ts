import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; jobId: string }> },
) {
  const { projectId, jobId } = await context.params;
  const user = await requireUser(`/app/projects/${projectId}`);
  const job = await createPhase2Repository(getPrisma()).findJobOwned(
    user.id,
    projectId,
    jobId,
  );
  if (!job) {
    return NextResponse.json(
      { error: "This generation job is not available." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    mode: job.mode,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    safeErrorCode: job.safeErrorCode,
    steps: job.steps.map((step) => ({
      key: step.key,
      label: step.label,
      status: step.status,
    })),
  });
}
