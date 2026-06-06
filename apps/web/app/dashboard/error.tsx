'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
