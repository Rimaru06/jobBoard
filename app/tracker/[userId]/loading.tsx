export default function TrackerLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 h-9 w-48 animate-pulse rounded bg-bg-panel" />
      <div className="h-20 animate-pulse rounded border border-border bg-bg-panel" />
      <div className="mt-4 h-24 animate-pulse rounded border border-border bg-bg-panel" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded border border-border bg-bg-panel" />
        ))}
      </div>
    </main>
  );
}
