export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-32 rounded-2xl bg-stone-200/70" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-2xl bg-stone-200/70" />
        <div className="h-16 rounded-2xl bg-stone-200/70" />
        <div className="h-16 rounded-2xl bg-stone-200/70" />
      </div>
      <div className="h-48 rounded-2xl bg-stone-200/70" />
    </div>
  );
}
