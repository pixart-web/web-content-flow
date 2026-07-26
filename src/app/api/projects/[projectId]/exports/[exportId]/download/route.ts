import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getOwnedExport } from "@/server/export/export-service";
import {
  enforceRateLimit,
  hashRateLimitSubject,
} from "@/server/security/rate-limit";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ projectId: string; exportId: string }>;
  },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const { projectId, exportId } = await context.params;
  try {
    await enforceRateLimit({
      action: "export-download",
      subjectHash: hashRateLimitSubject(session.user.id),
      limit: 60,
      windowSeconds: 60,
    });
  } catch {
    return NextResponse.json(
      { error: "Please try again shortly." },
      { status: 429 },
    );
  }
  const record = await getOwnedExport(session.user.id, projectId, exportId);
  if (!record)
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  return new NextResponse(record.payload, {
    status: 200,
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": `attachment; filename="${record.filename}"`,
      "Content-Length": String(record.byteSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Export-Checksum": record.checksum,
    },
  });
}
