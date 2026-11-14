import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { DESKTOP_TOKEN_HEADER, localModeDecision } from "@/lib/app-mode";

export function proxy(request: NextRequest) {
  if (process.env.APP_MODE === "local") {
    // A production desktop build without its token must fail closed.
    if (process.env.NODE_ENV === "production" && !process.env.DESKTOP_TOKEN)
      return new NextResponse("Forbidden", { status: 403 });
    const decision = localModeDecision({
      pathname: request.nextUrl.pathname,
      expectedToken: process.env.DESKTOP_TOKEN || undefined,
      providedToken: request.headers.get(DESKTOP_TOKEN_HEADER),
    });
    if (decision.action === "reject")
      return new NextResponse("Forbidden", { status: 403 });
    if (decision.action === "redirect")
      return NextResponse.redirect(new URL(decision.location, request.url));
  }
  const requestHeaders = new Headers(request.headers);
  const requestId = randomUUID();
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
