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
      <div
        style={{
          width: 130,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.16)",
        }}
      >
        <div style={{ width: `${v}%`, height: "100%", background: "rgba(255,255,255,0.78)" }} />
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right", color: "rgba(255,255,255,0.92)" }}>
        {v}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "neutral" }) {
  const styles: Record<string, React.CSSProperties> = {
    ok: {
      background: "rgba(120, 255, 160, 0.16)",
      border: "1px solid rgba(120, 255, 160, 0.30)",
      color: "rgba(230, 255, 240, 0.95)",
    },
    warn: {
      background: "rgba(255, 210, 120, 0.16)",
      border: "1px solid rgba(255, 210, 120, 0.30)",
      color: "rgba(255, 245, 230, 0.95)",
    },
    neutral: {
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.16)",
      color: "rgba(255,255,255,0.90)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        ...styles[tone],
      }}
    >
      {label}
    </span>
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
  return Boolean(r.offer_made ?? r.has_offer ?? r.offered ?? r.offer ?? false);
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
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontWeight: 800,
      }}
    >
      {props.children}
    </button>
  );
}

function ActionButton(props: {
  variant: "primary" | "secondary" | "neutral" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    letterSpacing: "0.2px",
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.65 : 1,
    color: "rgba(255,255,255,0.98)",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "rgba(80,160,255,0.35)", border: "1px solid rgba(120,190,255,0.45)" },
    secondary: { background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)" },
    neutral: { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)" },
    danger: { background: "rgba(255,90,90,0.20)", border: "1px solid rgba(255,120,120,0.35)" },
  };

  return (
    <button onClick={props.onClick} disabled={props.disabled} style={{ ...base, ...variants[props.variant] }}>
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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"interest" | "stars" | "name">("interest");
  const [view, setView] = React.useState<"all" | "board">("all");
  const [error, setError] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);
  const [visitWeekChoice, setVisitWeekChoice] = React.useState<Record<string, number>>({});

  React.useEffect(() => setRows(props.recruits ?? []), [props.recruits]);

  const boardCount = React.useMemo(() => rows.filter((r) => Boolean(r.on_board)).length, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;

    if (view === "board") list = list.filter((r) => Boolean(r.on_board));
    if (q) list = list.filter((r) => getName(r).toLowerCase().includes(q) || String(getPos(r)).toLowerCase().includes(q));

    return list.slice().sort((a, b) => {
      if (sort === "interest") return Number(b.my_interest ?? 0) - Number(a.my_interest ?? 0);
      if (sort === "stars") return Number(getStars(b) || 0) - Number(getStars(a) || 0);
      return getName(a).localeCompare(getName(b));
    });
  }, [rows, query, sort, view]);

  // =========================
  // OFFERS (PAID via RPC)
  // =========================
  async function onToggleOffer(r: Recruit) {
    const rid = r._recruit_id;
    const wasOffered = getOfferFlag(r);

    setError(null);
    setBusy((m) => ({ ...m, [rid]: true }));

    // optimistic
    setRows((prev) =>
      prev.map((x) =>
        x._recruit_id === rid
          ? { ...x, offer_made: !wasOffered, has_offer: !wasOffered, offered: !wasOffered }
          : x
      )
    );

    try {
      const { data, error: rpcErr } = await supabase.rpc("recruiting_toggle_offer_paid_v1", {
        p_league_id: props.leagueId,
        p_team_id: props.teamId,
        p_recruit_id: rid,
        p_season: props.currentSeason,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      const nowOffered = Boolean(data);
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid
            ? { ...x, offer_made: nowOffered, has_offer: nowOffered, offered: nowOffered }
            : x
        )
      );
    } catch (e: any) {
      // revert
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid
            ? { ...x, offer_made: wasOffered, has_offer: wasOffered, offered: wasOffered }
            : x
        )
      );
      setError(e?.message ?? "Failed to toggle offer.");
    } finally {
      setBusy((m) => ({ ...m, [rid]: false }));
    }
  }

  // =========================
  // BOARD (UPSERT to avoid unique constraint errors)
  // =========================
  async function onToggleBoard(r: Recruit) {
    const rid = r._recruit_id;
    const wasOn = Boolean(r.on_board);

    setError(null);
    setBusy((m) => ({ ...m, [`board:${rid}`]: true }));

    setRows((prev) => prev.map((x) => (x._recruit_id === rid ? { ...x, on_board: !wasOn } : x)));

    try {
      if (!wasOn) {
        const { error: upErr } = await supabase.from("recruiting_board").upsert(
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
        if (upErr) throw new Error(upErr.message);
      } else {
        const { error: delErr } = await supabase
          .from("recruiting_board")
          .delete()
          .eq("league_id", props.leagueId)
          .eq("team_id", props.teamId)
          .eq("recruit_id", rid)
          .eq("season", props.currentSeason);
        if (delErr) throw new Error(delErr.message);
      }
    } catch (e: any) {
      setRows((prev) => prev.map((x) => (x._recruit_id === rid ? { ...x, on_board: wasOn } : x)));
      setError(e?.message ?? "Failed to update board.");
    } finally {
      setBusy((m) => ({ ...m, [`board:${rid}`]: false }));
    }
  }

  function getDefaultVisitWeek(r: Recruit) {
    const scheduled = Number(r.my_visit_week ?? 0);
    if (scheduled > 0) return scheduled;
    return Math.min(16, Math.max(1, props.currentWeek + 1));
  }

  // =========================
  // VISITS (PAID via RPC wrapper)
  // =========================
  async function onScheduleVisit(r: Recruit) {
    const rid = r._recruit_id;
    const chosenWeek = visitWeekChoice[rid] ?? getDefaultVisitWeek(r);

    setError(null);
    setBusy((m) => ({ ...m, [`visit:${rid}`]: true }));

    // optimistic: scheduled but not applied yet
    setRows((prev) =>
      prev.map((x) =>
        x._recruit_id === rid
          ? { ...x, my_visit_week: chosenWeek, my_visit_bonus: x.my_visit_bonus ?? 5, my_visit_applied: false }
          : x
      )
    );

    try {
      const { error: rpcErr } = await supabase.rpc("schedule_recruit_visit_paid_v1", {
        p_league_id: props.leagueId,
        p_team_id: props.teamId,
        p_recruit_id: rid,
        p_week: chosenWeek,
        p_bonus: 5,
        p_season: props.currentSeason,
      });

      if (rpcErr) throw new Error(rpcErr.message);
    } catch (e: any) {
      setRows((prev) =>
        prev.map((x) => (x._recruit_id === rid ? { ...x, my_visit_week: null, my_visit_bonus: null } : x))
      );
      setError(e?.message ?? "Failed to schedule visit.");
    } finally {
      setBusy((m) => ({ ...m, [`visit:${rid}`]: false }));
    }
  }

  async function onRemoveVisit(r: Recruit) {
    const rid = r._recruit_id;

    setError(null);
    setBusy((m) => ({ ...m, [`visit:${rid}`]: true }));

    const prevWeek = r.my_visit_week ?? null;
    const prevBonus = r.my_visit_bonus ?? null;

    setRows((prev) =>
      prev.map((x) => (x._recruit_id === rid ? { ...x, my_visit_week: null, my_visit_bonus: null } : x))
    );

    try {
      // Removing visit: no refund in v1
      const { error: rpcErr } = await supabase.rpc("remove_recruit_visit_v1", {
        p_league_id: props.leagueId,
        p_team_id: props.teamId,
        p_recruit_id: rid,
      });

      if (rpcErr) throw new Error(rpcErr.message);
    } catch (e: any) {
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid ? { ...x, my_visit_week: prevWeek, my_visit_bonus: prevBonus } : x
        )
      );
      setError(e?.message ?? "Failed to remove visit.");
    } finally {
      setBusy((m) => ({ ...m, [`visit:${rid}`]: false }));
    }
  }

  return (
    <div style={{ color: "rgba(255,255,255,0.94)" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <PillButton active={view === "all"} onClick={() => setView("all")}>
          All Recruits
        </PillButton>
        <PillButton active={view === "board"} onClick={() => setView("board")}>
          My Board ({boardCount})
        </PillButton>

        <div style={{ flex: 1 }} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or position…"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            minWidth: 260,
            outline: "none",
          }}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            outline: "none",
          }}
        >
          <option value="interest">Sort: My Interest</option>
          <option value="stars">Sort: Stars</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,120,120,0.45)",
            background: "rgba(255,0,0,0.10)",
            color: "rgba(255,230,230,0.95)",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 1.2fr 90px 90px 220px 120px 140px",
            gap: 10,
            padding: "10px 12px",
            fontWeight: 900,
            background: "rgba(255,255,255,0.10)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          <div />
          <div>Recruit</div>
          <div>Pos</div>
          <div>Stars</div>
          <div>My Interest</div>
          <div>Board</div>
          <div />
        </div>

        {filtered.map((r) => {
          const rid = r._recruit_id;
          const open = Boolean(expanded[rid]);
          const offered = getOfferFlag(r);
          const top8 = Array.isArray(r.top8) ? (r.top8 as Top8Entry[]) : [];
          const myInterest = Number(r.my_interest ?? 0);
          const onBoard = Boolean(r.on_board);
          const rowHover = hover === rid;

          const scheduledWeek = r.my_visit_week ? Number(r.my_visit_week) : null;
          const scheduledBonus = r.my_visit_bonus != null ? Number(r.my_visit_bonus) : null;

          const chosenWeek = visitWeekChoice[rid] ?? getDefaultVisitWeek(r);

          return (
            <div key={rid} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                onMouseEnter={() => setHover(rid)}
                onMouseLeave={() => setHover(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px 1.2fr 90px 90px 220px 120px 140px",
                  gap: 10,
                  padding: "10px 12px",
                  alignItems: "center",
                  background: rowHover ? "rgba(255,255,255,0.05)" : "transparent",
                }}
              >
                <button
                  onClick={() => setExpanded((m) => ({ ...m, [rid]: !open }))}
                  aria-label={open ? "Collapse" : "Expand"}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.95)",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  {open ? "–" : "+"}
                </button>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 850, color: "rgba(255,255,255,0.96)" }}>{getName(r)}</div>
                  <div style={{ opacity: 0.78, fontSize: 12 }}>{rid}</div>
                </div>

                <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 750 }}>{getPos(r)}</div>
                <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 750 }}>{getStars(r)}</div>
                <InterestBar value={myInterest} />

                <ActionButton variant="secondary" onClick={() => onToggleBoard(r)} disabled={Boolean(busy[`board:${rid}`])}>
                  {busy[`board:${rid}`] ? "…" : onBoard ? "On Board" : "Add"}
                </ActionButton>

                <ActionButton variant="primary" onClick={() => onToggleOffer(r)} disabled={Boolean(busy[rid])}>
                  {busy[rid] ? "…" : offered ? "Remove Offer" : "Make Offer"}
                </ActionButton>
              </div>

              {open ? (
                <div style={{ padding: "0 12px 12px 48px", display: "grid", gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 8, color: "rgba(255,255,255,0.95)" }}>Visit</div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        alignItems: "center",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 14,
                        padding: 10,
                        maxWidth: 760,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800, opacity: 0.95 }}>
                          {scheduledWeek ? (
                            <>
                              Scheduled: <span style={{ fontVariantNumeric: "tabular-nums" }}>Week {scheduledWeek}</span>
                              {scheduledBonus != null ? <span style={{ opacity: 0.85 }}> • (+{scheduledBonus})</span> : null}
                            </>
                          ) : (
                            <span style={{ opacity: 0.85 }}>No visit scheduled.</span>
                          )}
                        </div>

                        {scheduledWeek ? (
                          r.my_visit_applied ? (
                            <StatusPill label="Applied ✅" tone="ok" />
                          ) : (
                            <StatusPill label="Pending" tone="warn" />
                          )
                        ) : null}
                      </div>

                      <div style={{ flex: 1 }} />

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ fontWeight: 800, opacity: 0.9 }}>Week</label>
                        <select
                          value={chosenWeek}
                          onChange={(e) => setVisitWeekChoice((m) => ({ ...m, [rid]: Number(e.target.value) }))}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.92)",
                            outline: "none",
                          }}
                        >
                          {Array.from({ length: 16 }).map((_, i) => {
                            const wk = i + 1;
                            return (
                              <option key={wk} value={wk}>
                                {wk}
                              </option>
                            );
                          })}
                        </select>

                        {!scheduledWeek ? (
                          <ActionButton variant="secondary" disabled={Boolean(busy[`visit:${rid}`])} onClick={() => onScheduleVisit(r)}>
                            {busy[`visit:${rid}`] ? "…" : "Schedule Visit"}
                          </ActionButton>
                        ) : (
                          <>
                            <ActionButton variant="secondary" disabled={Boolean(busy[`visit:${rid}`])} onClick={() => onScheduleVisit(r)}>
                              {busy[`visit:${rid}`] ? "…" : "Reschedule"}
                            </ActionButton>
                            <ActionButton variant="danger" disabled={Boolean(busy[`visit:${rid}`])} onClick={() => onRemoveVisit(r)}>
                              {busy[`visit:${rid}`] ? "…" : "Remove"}
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 8, color: "rgba(255,255,255,0.95)" }}>Top 8</div>

                    {top8.length === 0 ? (
                      <div style={{ opacity: 0.85 }}>No interest data yet.</div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 90px",
                          maxWidth: 560,
                          border: "1px solid rgba(255,255,255,0.14)",
                          borderRadius: 14,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            display: "grid",
                            gridTemplateColumns: "1fr 90px",
                            padding: "8px 10px",
                            background: "rgba(255,255,255,0.10)",
                            fontWeight: 900,
                          }}
                        >
                          <div>School</div>
                          <div style={{ textAlign: "right" }}>Interest</div>
                        </div>

                        {top8.map((t, idx) => (
                          <React.Fragment key={`${rid}:${t.team_id}:${idx}`}>
                            <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                              {t.team_name}
                            </div>
                            <div
                              style={{
                                padding: "8px 10px",
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                borderTop: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {clamp(Number(t.interest ?? 0))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
