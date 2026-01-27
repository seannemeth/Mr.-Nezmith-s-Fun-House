// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

export type Props = {
  leagueId: string;
  teamId: string;

  // Optional so this component can never crash if the server page changes.
  recruits?: any[];
};

function getRecruitName(r: any) {
  return (
    r?.name ??
    r?.full_name ??
    [r?.first_name, r?.last_name].filter(Boolean).join(" ") ??
    r?.player_name ??
    r?.id ??
    "Unknown"
  );
}

function getRecruitMeta(r: any) {
  const pos = r?.position ?? r?.pos ?? "";
  const stars = r?.stars ?? r?.star_rating ?? r?.rating_stars ?? "";
  const state = r?.state ?? r?.home_state ?? "";
  const archetype = r?.archetype ?? "";
  const parts = [pos, stars ? `${stars}★` : "", state, archetype].filter(Boolean);
  return parts.join(" · ");
}

function hasOfferForTeam(r: any) {
  // tolerate multiple possible RPC shapes
  return Boolean(
    r?.has_offer ??
      r?.hasOffer ??
      r?.offer_made ??
      r?.offered ??
      r?.is_offered ??
      r?.my_offer ??
      r?.myOffer
  );
}

export default function RecruitingClient(props: Props) {
  const [rows, setRows] = React.useState<any[]>(Array.isArray(props.recruits) ? props.recruits : []);
  const [busyRecruitId, setBusyRecruitId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  // keep in sync if server revalidates and sends new list
  React.useEffect(() => {
    if (Array.isArray(props.recruits)) setRows(props.recruits);
  }, [props.recruits]);

  async function toggleOffer(recruit: any) {
    const recruitId = recruit?.id;
    if (!recruitId) {
      setMsg("❌ Recruit row missing id.");
      return;
    }

    setMsg(null);
    setBusyRecruitId(recruitId);

    try {
      const currentlyOffered = hasOfferForTeam(recruit);

      const res = currentlyOffered
        ? await removeOfferAction({
            leagueId: props.leagueId,
            teamId: props.teamId,
            recruitId,
          })
        : await makeOfferAction({
            leagueId: props.leagueId,
            teamId: props.teamId,
            recruitId,
          });

      if (!res?.ok) {
        setMsg(`❌ ${res?.message ?? "Action failed"}`);
        return;
      }

      setMsg(`✅ ${res.message}`);

      // optimistic update so UI flips instantly
      setRows((prev) =>
        (prev ?? []).map((r) => {
          if (r?.id !== recruitId) return r;
          const next = { ...r };

          // flip any known offer flags
          if ("has_offer" in next) next.has_offer = !currentlyOffered;
          if ("hasOffer" in next) next.hasOffer = !currentlyOffered;
          if ("offer_made" in next) next.offer_made = !currentlyOffered;
          if ("offered" in next) next.offered = !currentlyOffered;
          if ("is_offered" in next) next.is_offered = !currentlyOffered;
          if ("my_offer" in next) next.my_offer = !currentlyOffered;
          if ("myOffer" in next) next.myOffer = !currentlyOffered;

          // if none existed, set a canonical one
          if (
            !("has_offer" in next) &&
            !("hasOffer" in next) &&
            !("offer_made" in next) &&
            !("offered" in next) &&
            !("is_offered" in next) &&
            !("my_offer" in next) &&
            !("myOffer" in next)
          ) {
            next.has_offer = !currentlyOffered;
          }

          return next;
        })
      );
    } finally {
      setBusyRecruitId(null);
    }
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {msg ? (
        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg}</div>
      ) : null}

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
          }}
        >
          Recruits ({safeRows.length})
        </div>

        {safeRows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8, fontSize: 13 }}>
            No recruits returned. (If this is a brand-new league, confirm recruits were seeded
            and that <code>get_recruit_list_v1</code> returns rows for this league/team.)
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {safeRows.map((r) => {
              const offered = hasOfferForTeam(r);
              const rid = r?.id ?? Math.random().toString(36);

              return (
                <div
                  key={rid}
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
                    <div style={{ fontWeight: 800 }}>{getRecruitName(r)}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{getRecruitMeta(r)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleOffer(r)}
                    disabled={busyRecruitId === r?.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontWeight: 800,
                      cursor: busyRecruitId === r?.id ? "not-allowed" : "pointer",
                      opacity: busyRecruitId === r?.id ? 0.7 : 1,
                    }}
                    aria-busy={busyRecruitId === r?.id}
                  >
                    {busyRecruitId === r?.id
                      ? "Working…"
                      : offered
                      ? "Remove Offer"
                      : "Make Offer"}
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
