"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, color: "white" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Application error</h1>
      <p style={{ opacity: 0.8 }}>A server-side exception occurred.</p>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }}>
        <div style={{ fontWeight: 800 }}>Message</div>
        <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{error.message}</pre>
        {error.digest ? (
          <>
            <div style={{ fontWeight: 800, marginTop: 10 }}>Digest</div>
            <pre style={{ opacity: 0.9 }}>{error.digest}</pre>
          </>
        ) : null}
      </div>

      <button
        onClick={() => reset()}
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.08)",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
