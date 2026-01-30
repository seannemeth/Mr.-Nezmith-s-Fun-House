// app/league/[leagueId]/recruiting/recruiting-client.tsx
"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";

type Top8Entry = {
  team_id: string;
  team_name: string;
  interest: number;
};

type Recruit = Record<string, any> & {
  _recruit_id: string;
  my_interest?: number;
  top8?: Top8Entry[];
  on_board?: boolean;
  my_visit_week?: number | null;
  my_visit_bonus?: number | null;
  my_visit_applied?: boolean;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function InterestBar({ value }: { value: number }) {
  const v = clamp(Number(value ?? 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
      <div style={{ width: 130, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: "rgba(255,255,255,0.78)" }} />
      </div>
      <div style={{ width: 34, textAlign: "right" }}>{v}</div>
    </div>
  );
}

function getName(r: Recruit) {
  return r.name ?? r.full_name ?? [r.first_name, r.last_name].filter(Boolean).join(" ") ?? "Recruit";
}
function getPos(r: Recruit) {
  return r.position ?? r.pos ?? "";
}
function getStars(r: Recruit) {
  const s = r.stars ?? r.rating_stars ?? r.star_rating;
  return s == null ? "" : String(s);
}
function getOfferFlag(r: Recruit) {
  return Boolean(r.offer_made ?? r.has_offer ?? r.offered ?? false);
}

function PillButton(props: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: props.active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

function ActionButton(props: {
  variant: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    primary: "rgba(80,160,255,0.35)",
    secondary: "rgba(255,255,255,0.16)",
    danger: "rgba(255,90,90,0.25)",
  };
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.18)",
        background: colors[props.variant],
        fontWeight: 900,
        cursor: props.disabled ? "not-allowed" : "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

export default function RecruitingClient(props: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  leagueId: string;
  teamId: string;
  recruits: Recruit[];
  currentSeason: number;
  currentWeek: number;
}) {
  const supabase = React.useMemo(
    () => createBrowserClient(props.supabaseUrl, props.supabaseAnonKey),
    [props.supabaseUrl, props.supabaseAnonKey]
  );

  const [rows, setRows] = React.useState<Recruit[]>(props.recruits ?? []);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [view, setView] = React.useState<"all" | "board">("all");
  const [error, setError] = React.useState<string | null>(null);

  const filtered = rows.filter((r) => (view === "board" ? r.on_board : true));

  // =========================
  // PAID OFFER TOGGLE
  // =========================
  async function onToggleOffer(r: Recruit) {
    const rid = r._recruit_id;
    const wasOffered = getOfferFlag(r);

    setBusy((m) => ({ ...m, [rid]: true }));
    setError(null);

    setRows((prev) =>
      prev.map((x) =>
        x._recruit_id === rid ? { ...x, offer_made: !wasOffered, has_offer: !wasOffered } : x
      )
    );

    try {
      const { data, error } = await supabase.rpc("recruiting_toggle_offer_paid_v1", {
        p_league_id: props.leagueId,
        p_team_id: props.teamId,
        p_recruit_id: rid,
        p_season: props.currentSeason,
      });
      if (error) throw error;

      const nowOffered = Boolean(data);
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid ? { ...x, offer_made: nowOffered, has_offer: nowOffered } : x
        )
      );
    } catch (e: any) {
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid ? { ...x, offer_made: wasOffered, has_offer: wasOffered } : x
        )
      );
      setError(e.message);
    } finally {
      setBusy((m) => ({ ...m, [rid]: false }));
    }
  }

  // =========================
  // BOARD TOGGLE (UPSERT SAFE)
  // =========================
  async function onToggleBoard(r: Recruit) {
    const rid = r._recruit_id;
    const wasOn = Boolean(r.on_board);

    setBusy((m) => ({ ...m, [`board:${rid}`]: true }));
    setError(null);

    setRows((prev) => prev.map((x) => (x._recruit_id === rid ? { ...x, on_board: !wasOn } : x)));

    try {
      if (!wasOn) {
        const { error } = await supabase.from("recruiting_board").upsert(
          {
            league_id: props.leagueId,
            team_id: props.teamId,
            recruit_id: rid,
            season: props.currentSeason,
          },
          {
            onConflict: "league_id,team_id,recruit_id,season",
            ignoreDuplicates: true,
          }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recruiting_board")
          .delete()
          .eq("league_id", props.leagueId)
          .eq("team_id", props.teamId)
          .eq("recruit_id", rid)
          .eq("season", props.currentSeason);
        if (error) throw error;
      }
    } catch (e: any) {
      setRows((prev) => prev.map((x) => (x._recruit_id === rid ? { ...x, on_board: wasOn } : x)));
      setError(e.message);
    } finally {
      setBusy((m) => ({ ...m, [`board:${rid}`]: false }));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <PillButton active={view === "all"} onClick={() => setView("all")}>
          All Recruits
        </PillButton>
        <PillButton active={view === "board"} onClick={() => setView("board")}>
          My Board
        </PillButton>
      </div>

      {error && <div style={{ marginBottom: 10, color: "red" }}>{error}</div>}

      {filtered.map((r) => (
        <div key={r._recruit_id} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          <strong>{getName(r)}</strong>
          <span>{getPos(r)}</span>
          <span>{getStars(r)}★</span>

          <ActionButton variant="secondary" onClick={() => onToggleBoard(r)} disabled={busy[`board:${r._recruit_id}`]}>
            {r.on_board ? "On Board" : "Add"}
          </ActionButton>

          <ActionButton variant="primary" onClick={() => onToggleOffer(r)} disabled={busy[r._recruit_id]}>
            {getOfferFlag(r) ? "Remove Offer" : "Make Offer"}
          </ActionButton>
        </div>
      ))}
    </div>
  );
}
