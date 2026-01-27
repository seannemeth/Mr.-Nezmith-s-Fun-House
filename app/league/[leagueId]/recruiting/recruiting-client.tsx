// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

export type Props = {
  leagueId: string;
  teamId: string;
  recruits?: any[];
  rpcError?: string | null;
};

// ...keep rest of your current file...
// Add this near the top of render output:

export default function RecruitingClient(props: Props) {
  // (keep your existing state logic)

  const safeRows = Array.isArray(props.recruits) ? props.recruits : [];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {props.rpcError ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(180,0,0,0.25)",
            background: "rgba(180,0,0,0.04)",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          ❌ get_recruit_list_v1 error: {props.rpcError}
        </div>
      ) : null}

      {/* keep the rest of your UI, but use safeRows instead of undefined arrays */}
      {/* ... */}
      <div style={{ opacity: 0.8, fontSize: 13 }}>
        Recruits ({safeRows.length})
      </div>

      {/* render list... */}
    </div>
  );
}
