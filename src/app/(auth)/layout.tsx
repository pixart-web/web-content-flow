import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { THEME_COOKIE, parseTheme } from "@/features/theme/theme";

// Sign-in, sign-up and password recovery (doc 55, S5): the same theme as the
// app (Studio by default), read on the server so there is no flash.
export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <main
      className="auth-shell bg-canvas text-primary flex min-h-screen items-center justify-center px-4 py-10"
      data-theme={theme}
    >
      <div aria-hidden className="auth-glow" />
      <div className="relative w-full max-w-md">
        <Link
          className="font-display focus-visible:outline-focus inline-flex min-h-11 items-center gap-3 text-lg font-semibold"
          href="/"
        >
          <Image
            alt=""
            aria-hidden
            height={30}
            src="/brand/symbol/flow-mark.svg"
            width={30}
          />
          Web Content Flow
        </Link>
        <section className="border-default bg-surface shadow-card rounded-panel mt-6 border p-6 sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
