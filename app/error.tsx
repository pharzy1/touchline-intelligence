"use client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell" style={{ padding: "8rem 1.5rem", textAlign: "center" }}><p className="eyebrow">RECOVERABLE ERROR</p><h1>The analysis panel hit a problem.</h1><p>{error.message || "An unexpected error occurred."}</p><button className="share-link" onClick={reset}>Try again</button></main>;
}
