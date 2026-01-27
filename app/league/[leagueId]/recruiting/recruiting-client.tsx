// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

export type Props = {
  leagueId: string;
  teamId: string;
};

export default function RecruitingClient(props: Props) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  // Minimal safe UI so your app runs while we repair the real recruiting UI.
  // This also confirms actions wiring is working.
  async function testToggleOffer() {
    setMsg(null);
    setBusyId("test");
    try {
      // Replace "TEST_RECRUIT_ID" with a real recruit id if you want to test.
      const recruitId = "TEST_RECRUIT_ID";
      const res = await makeOfferAction({
        leagueId: props.leagueId,
        teamId: props.teamId,
        recruitId,
      });
      setMsg(res.ok ? "✅ makeOfferAction ok" : `❌ ${res.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Recruiting</div>
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        League: {props.leagueId}
        <br />
        Team: {props.teamId}
      </div>

      <button
        type="button"
        onClick={testToggleOffer}
        disabled={busyId === "test"}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.15)",
          fontWeight: 800,
          cursor: busyId === "test" ? "not-allowed" : "pointer",
          width: "fit-content",
        }}
      >
        {busyId === "test" ? "Testing…" : "Test makeOfferAction"}
      </button>

      {msg ? <div style={{ fontSize: 13 }}>{msg}</div> : null}

      <div style={{ fontSize: 13, opacity: 0.7 }}>
        Your previous recruiting UI file was truncated and needs to be restored.
        Once you paste the top ~80 lines of the original recruiting-client, I’ll
        return a full drop-in that keeps your UI and adds the safe defaults
        without breaking syntax.
      </div>
    </div>
  );
}
