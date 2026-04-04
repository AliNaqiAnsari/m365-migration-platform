"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html>
      <body>
        <div style={{ padding: "2rem", fontFamily: "monospace" }}>
          <h1>Application Error</h1>
          <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
            {error.message}
          </pre>
          <pre style={{ fontSize: "0.75rem", color: "#888", whiteSpace: "pre-wrap" }}>
            {error.stack}
          </pre>
        </div>
      </body>
    </html>
  );
}
