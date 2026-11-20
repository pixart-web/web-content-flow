import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { EXPECTED_DATABASE_MIGRATION } from "@/server/db/expected-migration";
import { getPrisma } from "@/server/db/prisma";
import { getRolloutPolicy } from "@/server/launch/rollout";
import {
  enforceRateLimit,
  hashRateLimitSubject,
} from "@/server/security/rate-limit";
import {
  exportWorkspace,
  importWorkspace,
} from "@/server/workspace/workspace-package";

// Route handlers for the workspace package (doc 52, LF-12).

/** Largest upload the import route reads (compressed package). */
export const WORKSPACE_PACKAGE_MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

const unavailable = () =>
  NextResponse.json({ error: "Unavailable" }, { status: 404 });

async function limited(userId: string, action: string) {
  try {
    await enforceRateLimit({
      action,
      subjectHash: hashRateLimitSubject(userId),
      limit: 5,
      windowSeconds: 60,
    });
    return null;
  } catch {
    return NextResponse.json(
      { error: "Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
}

export async function handleWorkspaceExport() {
  const session = await auth();
  if (!session?.user?.id) return unavailable();
  if (!getRolloutPolicy().workspacePackageEnabled)
    return NextResponse.json(
      { error: "Workspace export is not enabled." },
      { status: 403 },
    );
  const tooMany = await limited(session.user.id, "workspace-export");
  if (tooMany) return tooMany;
  const result = await exportWorkspace(getPrisma(), {
    userId: session.user.id,
    appRelease: process.env.APP_RELEASE?.slice(0, 100) || "unknown",
    databaseMigration: EXPECTED_DATABASE_MIGRATION,
  });
  if (!result.ok)
    return NextResponse.json({ error: result.message }, { status: 409 });
  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleWorkspaceImport(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unavailable();
  // Only the app's own pages may start an import.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return unavailable();
  if (!getRolloutPolicy().workspacePackageEnabled)
    return NextResponse.json(
      { error: "Workspace import is not enabled." },
      { status: 403 },
    );
  const tooMany = await limited(session.user.id, "workspace-import");
  if (tooMany) return tooMany;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > WORKSPACE_PACKAGE_MAX_UPLOAD_BYTES)
    return NextResponse.json(
      { error: "This package is larger than 64 MB." },
      { status: 413 },
    );
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > WORKSPACE_PACKAGE_MAX_UPLOAD_BYTES)
    return NextResponse.json(
      { error: "This package is larger than 64 MB." },
      { status: 413 },
    );
  const result = await importWorkspace(getPrisma(), {
    userId: session.user.id,
    bytes,
  });
  if (!result.ok)
    return NextResponse.json(
      { error: result.message },
      { status: result.code === "NOT_FOUND" ? 404 : 400 },
    );
  return NextResponse.json({ summary: result.summary }, { status: 201 });
}
