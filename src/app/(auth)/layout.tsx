import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="bg-canvas text-primary flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          className="font-display focus-visible:outline-focus inline-flex min-h-11 items-center text-lg font-semibold"
          href="/"
        >
          Web Content Flow
        </Link>
        <section className="border-default bg-surface shadow-card rounded-panel mt-6 border p-6 sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
