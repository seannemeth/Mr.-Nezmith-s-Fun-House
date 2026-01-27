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

  const btnLabel = useMemo(() => {
    if (isPending) return "Advancing…";
    return "Advance Week";
  }, [isPending]);

  function onClick() {
    setStatus(null);
    setSummary(null);

    startTransition(async () => {
      const res = await advanceRecruitingWeek(leagueId);
      if (!res.ok) {
        setStatus(`❌ ${res.message}`);
        return;
      }
      setStatus(`✅ ${res.message}`);
      setSummary(res.summary ?? null);
    });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={Boolean(disabled) || isPending}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.15)",
          cursor: Boolean(disabled) || isPending ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
        aria-busy={isPending}
      >
        {btnLabel}
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
              border: "1px solid rgba(0,0,0,0.10)",
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
