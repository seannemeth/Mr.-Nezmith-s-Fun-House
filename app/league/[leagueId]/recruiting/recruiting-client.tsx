// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

export type RecruitRow = {
  id: string;
  name?: string;
  pos?: string;
  stars?: number;
  rank?: number;
  state?: string;
  archetype?: string;
  ovr?: number;
  top8?: any;
  offer?: boolean; // from RPC
  visit?: any;
  [k: string]: any;
};

export type Props = {
  leagueId: string;
  teamId: string;
  recruits?: RecruitRow[];
  rpcError?: string | null;
};

function meta(r: RecruitRow) {
  const parts = [
    r.pos ?? "",
    typeof r.stars === "number" ? `${r.stars}★` : "",
    typeof r.rank === "number" ? `#${r.rank}` : "",
    r.state ?? "",
    r.archetype ?? "",
    typeof r.ovr === "number" ? `OVR ${r.ovr}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function RecruitingClient(props: Props) {
  const [rows, setRows] = React.useState<RecruitRow[]>(
    Array.isArray(props.recruits) ? props.recruits : []
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (Array.isArray(props.recruits)) setRows(props.recruits);
  }, [props.recruits]);

  async function toggleOffer(r: RecruitRow) {
    if (!r?.id) {
      setMsg("❌ Recruit row missing id.");
      return;
    }

    setMsg(null);
    setBusyId(r.id);

    try {
      const hasOffer = Boolean(r.offer);

      const res = hasOffer
        ? await removeOfferAction({
            leagueId: props.leagueId,
            teamId: props.teamId,
            recruitId: r.id,
          })
        : await makeOfferAction({
            leagueId: props.leagueId,
            teamId: props.teamId,
            recruitId: r.id,
          });

      if (!res?.ok) {
        setMsg(`❌ ${res?.message ?? "Action failed"}`);
        return;
      }

      setMsg(`✅ ${res.message}`);

      setRows((prev) =>
        (prev ?? []).map((x) => (x.id === r.id ? { ...x, offer: !hasOffer } : x))
      );
    } finally {
      setBusyId(null);
    }
  }

  const safeRows = Array.isArray(rows) ? rows : [];

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

      {msg ? <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg}</div> : null}

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            fontWeight: 900,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span>Recruits</span>
          <span style={{ opacity: 0.7, fontSize: 13 }}>{safeRows.length}</span>
        </div>

        {safeRows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8, fontSize: 13 }}>
            No recruits returned for this league/team.
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {safeRows.map((r) => {
              const offered = Boolean(r.offer);
              const isBusy = busyId === r.id;

              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: 12,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800 }}>{r.name ?? r.id}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{meta(r)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleOffer(r)}
                    disabled={isBusy}
                    aria-busy={isBusy}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontWeight: 800,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      opacity: isBusy ? 0.7 : 1,
                    }}
                  >
                    {isBusy ? "Working…" : offered ? "Remove Offer" : "Make Offer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecruitingClient;
