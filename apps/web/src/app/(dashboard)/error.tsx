"use client";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h2>Dashboard Error</h2>
      <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>{error.message}</pre>
      <pre style={{ fontSize: "0.75rem", color: "#888", whiteSpace: "pre-wrap" }}>{error.stack}</pre>
      <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>Try again</button>
    </div>
  );
}
