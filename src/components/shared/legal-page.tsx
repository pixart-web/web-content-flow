import Link from "next/link";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-canvas min-h-screen px-4 py-14">
      <article className="mx-auto max-w-3xl">
        <Link className="text-link text-sm underline" href="/">
          Web Content Flow
        </Link>
        <h1 className="font-display mt-6 text-4xl font-semibold">{title}</h1>
        <div className="prose text-secondary mt-8 space-y-5 leading-7">
          {children}
        </div>
      </article>
    </main>
  );
}
