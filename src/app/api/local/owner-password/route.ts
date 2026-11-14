import { hash } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env/server";
import {
  checkLocalAdminRequest,
  DESKTOP_ADMIN_TOKEN_HEADER,
  ownerPasswordSchema,
} from "@/lib/local-admin";
import { resetLocalOwnerPassword } from "@/server/auth/local-owner";
import { getPrisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const passwordOptions: Options = {
  algorithm: 2,
  version: 1,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const noStore = { "Cache-Control": "no-store" };

// POST { password } — called by the desktop shell after macOS authentication.
export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const check = checkLocalAdminRequest({
    appMode: env.APP_MODE,
    expectedAdminToken: env.DESKTOP_ADMIN_TOKEN,
    providedAdminToken: request.headers.get(DESKTOP_ADMIN_TOKEN_HEADER),
  });
  if (!check.ok)
    return NextResponse.json(
      { error: check.status === 404 ? "not_found" : "forbidden" },
      { status: check.status, headers: noStore },
    );
  const parsed = ownerPasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "invalid_password",
        issues: parsed.error.issues.map((i) => i.message),
      },
      { status: 400, headers: noStore },
    );
  const updated = await resetLocalOwnerPassword(
    getPrisma(),
    await hash(parsed.data.password, passwordOptions),
  );
  if (!updated)
    return NextResponse.json(
      { error: "no_owner" },
      { status: 409, headers: noStore },
    );
  return NextResponse.json({ ok: true }, { headers: noStore });
}
