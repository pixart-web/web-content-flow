export default function AppLoading() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading workspace</span>
      <div className="bg-surface-subtle rounded-control h-9 w-48 animate-pulse motion-reduce:animate-none" />
      <div className="border-default bg-surface rounded-panel h-48 animate-pulse border motion-reduce:animate-none" />
    </div>
  );
}
