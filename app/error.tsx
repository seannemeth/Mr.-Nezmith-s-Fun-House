"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="card">
      <div className="h1">Application Error</div>
      <p className="muted">A server-side exception occurred. Check Vercel Runtime Logs for details.</p>
      <p className="muted">Digest: <b>{error.digest ?? "n/a"}</b></p>
      <button className="btn" onClick={() => reset()}>Try again</button>
    </div>
  );
}
