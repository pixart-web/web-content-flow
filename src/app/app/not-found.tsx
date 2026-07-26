import Link from "next/link";

export default function AppNotFound() {
  return (
    <section className="border-default bg-surface rounded-panel border p-6">
      <h1 className="font-display text-2xl font-semibold">
        This project is not available
      </h1>
      <p className="text-secondary mt-2">
        The project may not exist or may not be available to your account.
      </p>
      <Link
        className="text-link mt-5 inline-flex min-h-11 items-center font-semibold"
        href="/app/projects"
      >
        Return to projects
      </Link>
    </section>
  );
}
