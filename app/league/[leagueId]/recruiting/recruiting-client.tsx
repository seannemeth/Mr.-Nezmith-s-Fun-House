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
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseBrowser() {
  return createBrowserClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function InterestBar({ value }: { value: number }) {
  const v = clamp(Number(value ?? 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
      <div
        style={{
          width: 120,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            background: "rgba(255,255,255,0.65)",
          }}
        />
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right" }}>{v}</div>
    </div>
  );
}

async function toggleOfferServerless(opts: {
  leagueId: string;
  teamId: string;
  recruitId: string;
  season: number;
  makeOffer: boolean;
}) {
  // Client-side write is okay only if your RLS is strict (you already set that up).
  // If you prefer server actions only, tell me your existing action file path and
  // I’ll convert this back to server actions.
  const supabase = supabaseBrowser();

  if (opts.makeOffer) {
    const { error } = await supabase.from("recruiting_offers").insert({
      league_id: opts.leagueId,
      team_id: opts.teamId,
      recruit_id: opts.recruitId,
      season: opts.season,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("recruiting_offers")
      .delete()
      .eq("league_id", opts.leagueId)
      .eq("team_id", opts.teamId)
      .eq("recruit_id", opts.recruitId)
      .eq("season", opts.season);
    if (error) throw new Error(error.message);
  }
}

function getName(r: Recruit) {
  return (
    r.name ??
    r.full_name ??
    [r.first_name, r.last_name].filter(Boolean).join(" ") ??
    r.player_name ??
    "Recruit"
  );
}

function getPos(r: Recruit) {
  return r.position ?? r.pos ?? r.player_position ?? "";
}

function getStars(r: Recruit) {
  const s = r.stars ?? r.rating_stars ?? r.star_rating;
  return s == null ? "" : String(s);
}

function getOfferFlag(r: Recruit) {
  // tolerate multiple spellings from RPC
  return Boolean(r.offer_made ?? r.has_offer ?? r.offered ?? r.offer ?? false);
}

export default function RecruitingClient(props: {
  leagueId: string;
  teamId: string;
  recruits: Recruit[];
  currentSeason: number;
}) {
  const [rows, setRows] = React.useState<Recruit[]>(props.recruits ?? []);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"interest" | "stars" | "name">("interest");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(props.recruits ?? []);
  }, [props.recruits]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter((r) => {
        const name = getName(r).toLowerCase();
        const pos = String(getPos(r)).toLowerCase();
        return name.includes(q) || pos.includes(q);
      });
    }

    const sorted = list.slice().sort((a, b) => {
      if (sort === "interest") return Number(b.my_interest ?? 0) - Number(a.my_interest ?? 0);
      if (sort === "stars") return Number(getStars(b) || 0) - Number(getStars(a) || 0);
      return getName(a).localeCompare(getName(b));
    });

    return sorted;
  }, [rows, query, sort]);

  async function onToggleOffer(r: Recruit) {
    const rid = r._recruit_id;
    const isOffered = getOfferFlag(r);

    setError(null);
    setBusy((m) => ({ ...m, [rid]: true }));

    // optimistic update
    setRows((prev) =>
      prev.map((x) =>
        x._recruit_id === rid
          ? { ...x, offer_made: !isOffered, has_offer: !isOffered, offered: !isOffered }
          : x
      )
    );

    try {
      await toggleOfferServerless({
        leagueId: props.leagueId,
        teamId: props.teamId,
        recruitId: rid,
        season: props.currentSeason,
        makeOffer: !isOffered,
      });
    } catch (e: any) {
      // revert
      setRows((prev) =>
        prev.map((x) =>
          x._recruit_id === rid
            ? { ...x, offer_made: isOffered, has_offer: isOffered, offered: isOffered }
            : x
        )
      );
      setError(e?.message ?? "Failed to toggle offer.");
    } finally {
      setBusy((m) => ({ ...m, [rid]: false }));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or position…"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.15)",
            minWidth: 260,
          }}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.15)",
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
            borderRadius: 10,
            border: "1px solid rgba(255,120,120,0.35)",
            background: "rgba(255,0,0,0.08)",
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 1.4fr 90px 90px 220px 140px",
            gap: 10,
            padding: "10px 12px",
            fontWeight: 700,
            background: "rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div />
          <div>Recruit</div>
          <div>Pos</div>
          <div>Stars</div>
          <div>My Interest</div>
          <div />
        </div>

        {filtered.map((r) => {
          const rid = r._recruit_id;
          const open = Boolean(expanded[rid]);
          const offered = getOfferFlag(r);
          const top8 = Array.isArray(r.top8) ? (r.top8 as Top8Entry[]) : [];
          const myInterest = Number(r.my_interest ?? r.interest ?? 0);

          return (
            <div key={rid} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px 1.4fr 90px 90px 220px 140px",
                  gap: 10,
                  padding: "10px 12px",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => setExpanded((m) => ({ ...m, [rid]: !open }))}
                  aria-label={open ? "Collapse" : "Expand"}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.15)",
                    cursor: "pointer",
                  }}
                >
                  {open ? "–" : "+"}
                </button>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 650 }}>{getName(r)}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{rid}</div>
                </div>

                <div>{getPos(r)}</div>
                <div>{getStars(r)}</div>

                <InterestBar value={myInterest} />

                <button
                  onClick={() => onToggleOffer(r)}
                  disabled={Boolean(busy[rid])}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: offered ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
                    cursor: busy[rid] ? "not-allowed" : "pointer",
                    fontWeight: 650,
                  }}
                >
                  {busy[rid] ? "…" : offered ? "Remove Offer" : "Make Offer"}
                </button>
              </div>

              {open ? (
                <div style={{ padding: "0 12px 12px 48px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Top 8</div>

                  {top8.length === 0 ? (
                    <div style={{ opacity: 0.8 }}>No interest data yet.</div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px",
                        gap: 8,
                        maxWidth: 520,
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          display: "grid",
                          gridTemplateColumns: "1fr 90px",
                          padding: "8px 10px",
                          background: "rgba(255,255,255,0.06)",
                          fontWeight: 700,
                        }}
                      >
                        <div>School</div>
                        <div style={{ textAlign: "right" }}>Interest</div>
                      </div>

                      {top8.map((t) => (
                        <React.Fragment key={`${rid}:${t.team_id}`}>
                          <div style={{ padding: "8px 10px" }}>{t.team_name}</div>
                          <div style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {clamp(Number(t.interest ?? 0))}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
