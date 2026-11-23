// Loading state for the app (doc 55, S6): the shape of a Studio page, so the
// layout does not jump when content arrives. The pulse stops under reduced
// motion.
export default function AppLoading() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading workspace</span>
      <div
        className={`border-default bg-surface rounded-panel border p-8 ${pulse}`}
      >
        <div className="bg-surface-subtle rounded-control h-3 w-40" />
        <div className="bg-surface-subtle rounded-control mt-5 h-10 w-3/4 max-w-xl" />
        <div className="bg-surface-subtle rounded-control mt-3 h-10 w-1/2 max-w-md" />
        <div className="bg-surface-subtle rounded-control mt-8 h-12 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div
            className={`border-default bg-surface rounded-card h-32 border ${pulse}`}
            key={key}
          />
        ))}
      </div>
    </div>
  );
}
