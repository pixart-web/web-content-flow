import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ExportRequestSchema } from "@/server/export/export-schemas";
import { createContentExport } from "@/server/export/export-service";
import {
  enforceRateLimit,
  hashRateLimitSubject,
} from "@/server/security/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const { projectId } = await context.params;
  try {
    await enforceRateLimit({
      action: "export-create",
      subjectHash: hashRateLimitSubject(session.user.id),
      limit: 20,
      windowSeconds: 60,
    });
  } catch {
    return NextResponse.json(
      { error: "Please wait before creating another export." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  const form = await request.formData();
  const parsed = ExportRequestSchema.safeParse({
    format: form.get("format"),
    scope: form.get("scope"),
    itemIds: form
      .getAll("itemIds")
      .filter((value): value is string => typeof value === "string"),
    versionIds: form
      .getAll("versionIds")
      .filter((value): value is string => typeof value === "string"),
    ...(typeof form.get("module") === "string" && form.get("module")
      ? { module: form.get("module") }
      : {}),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the export options." },
      { status: 400 },
    );
  const result = await createContentExport({
    userId: session.user.id,
    projectId,
    request: parsed.data,
  });
  if (!result.ok)
    return NextResponse.json(
      { error: result.message },
      { status: result.code === "NOT_FOUND" ? 404 : 400 },
    );
  return NextResponse.redirect(
    new URL(
      `/api/projects/${projectId}/exports/${result.exportId}/download`,
      request.url,
    ),
    303,
  );
}
