// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";

export type Props = {
  leagueId: string;
  teamId: string;
};

export default function RecruitingClient(props: Props) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Recruiting</div>

      <div style={{ fontSize: 13, opacity: 0.8 }}>
        League: {props.leagueId}
        <br />
        Team: {props.teamId}
      </div>

      <div style={{ fontSize: 13, opacity: 0.75 }}>
        Your original recruiting UI was overwritten during the last patch attempt.
        Restore <code>recruiting-client.tsx</code> from git, then paste the top ~80
        lines here and I’ll return a full drop-in that:
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          <li>keeps your existing UI intact</li>
          <li>adds safe defaults so <code>.find</code> never runs on undefined</li>
          <li>keeps your current action signatures: <code>makeOfferAction({`{ leagueId, teamId, recruitId }`})</code></li>
        </ul>
      </div>
    </div>
  );
}
