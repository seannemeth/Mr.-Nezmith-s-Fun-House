// app/league/[leagueId]/recruiting/AdvanceWeekButton.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { advanceRecruitingWeek } from "./actions";

export default function AdvanceWeekButton({
  leagueId,
  disabled,
}: {
  leagueId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  async function onClick() {
    if (!leagueId) return;
    setBusy(true);
    setStatus(null);

    try {
      const res = await advanceRecruitingWeek(leagueId);

      if (!res?.ok) {
        setStatus(`❌ ${res?.message ?? "Failed"}`);
        return;
      }

      setStatus(`✅ ${res.message}`);

      // ✅ This is the key: re-fetch Server Component data
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={Boolean(disabled) || busy}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.15)",
          fontWeight: 900,
          cursor: Boolean(disabled) || busy ? "not-allowed" : "pointer",
          opacity: Boolean(disabled) || busy ? 0.7 : 1,
        }}
      >
        {busy ? "Advancing…" : "Advance Week"}
      </button>

      {status ? (
        <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}
