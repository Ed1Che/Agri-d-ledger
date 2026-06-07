'use client'

// Force dynamic to avoid Next.js 16.2 /_global-error prerender bug (E1068).
export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.25rem',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
