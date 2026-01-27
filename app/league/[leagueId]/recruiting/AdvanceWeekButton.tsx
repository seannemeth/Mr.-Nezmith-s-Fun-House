// app/league/[leagueId]/recruiting/AdvanceWeekButton.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { advanceRecruitingWeek } from "./actions";

type Props = {
  leagueId: string;
  disabled?: boolean;
};

export default function AdvanceWeekButton({ leagueId, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const label = useMemo(
    () => (isPending ? "Advancing…" : "Advance Week"),
    [isPending]
  );

  const onClick = () => {
    setStatus(null);
    setSummary(null);

    startTransition(async () => {
      const res = await advanceRecruitingWeek(leagueId);

      if (!res.ok) {
        setStatus(`❌ ${res.message}`);
        return;
      }

      setStatus(`✅ ${res.message}`);

      // Weekly processor output is returned as `data` by our actions.ts.
      // Also tolerate an older `summary` shape if you ever revert.
      const anyRes = res as any;
      setSummary(anyRes.data ?? anyRes.summary ?? null);
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={Boolean(disabled) || isPending}
        aria-busy={isPending}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.15)",
          fontWeight: 800,
          cursor: Boolean(disabled) || isPending ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>

      {status ? (
        <div style={{ fontSize: 13, opacity: 0.9, whiteSpace: "pre-wrap" }}>
          {status}
        </div>
      ) : null}

      {summary ? (
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: "pointer" }}>Processor summary</summary>
          <pre
            style={{
              marginTop: 8,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.1)",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(summary, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
