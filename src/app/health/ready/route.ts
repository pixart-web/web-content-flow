import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/server/db/prisma";
import { migrationsAreReady } from "@/server/db/migration-readiness";

export const dynamic = "force-dynamic";

async function withTimeout<T>(operation: Promise<T>, milliseconds: number) {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), milliseconds),
    ),
  ]);
}

export async function GET() {
  try {
    const env = getServerEnv();
    await withTimeout(getPrisma().$queryRaw`SELECT 1`, 2_000);
    const migrations = await withTimeout(
      getPrisma().$queryRaw<
        {
          migration_name: string;
          finished_at: Date | null;
          rolled_back_at: Date | null;
          logs: string | null;
        }[]
      >`SELECT migration_name, finished_at, rolled_back_at, logs
        FROM "_prisma_migrations"`,
      2_000,
    );
    const migrationReady = migrationsAreReady(migrations);
    const ready =
      migrationReady &&
      (!env.AI_REAL_GENERATION_ENABLED || Boolean(env.OPENAI_API_KEY)) &&
      (env.EMAIL_PROVIDER !== "RESEND" || Boolean(env.RESEND_API_KEY));
    return NextResponse.json(
      {
        status: ready ? "ready" : "not_ready",
        checks: {
          database: "ok",
          migrations: migrationReady ? "ok" : "unavailable",
          ai: env.AI_REAL_GENERATION_ENABLED ? "configured" : "disabled",
          email: env.EMAIL_PROVIDER === "MOCK" ? "mock" : "configured",
          exports: env.EXPORTS_ENABLED ? "configured" : "disabled",
        },
      },
      {
        status: ready ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: { database: "unavailable" },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
