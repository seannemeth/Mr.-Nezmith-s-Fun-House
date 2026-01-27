"use client";

// app/league/[leagueId]/recruiting/recruiting-client.tsx
import React, { useMemo, useState } from "react";
import type { RecruitRow } from "./page";

type Props = {
  leagueId: string;
  teamId: string;
  page: number;
  pageSize: number;
  recruits: RecruitRow[];
};

type SortKey = "rank" | "stars" | "ovr" | "name" | "pos" | "state";
type SortDir = "asc" | "desc";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asString(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function posGroup(pos: string) {
  // Optional grouping (feel free to tweak)
  const p = pos?.toUpperCase?.() ?? "";
  if (["QB"].includes(p)) return "QB";
  if (["RB", "FB"].includes(p)) return "RB";
  if (["WR", "TE"].includes(p)) return "REC";
  if (["OL", "C", "G", "T"].includes(p)) return "OL";
  if (["DL", "DT", "DE", "EDGE"].includes(p)) return "DL";
  if (["LB"].includes(p)) return "LB";
  if (["CB", "S", "DB"].includes(p)) return "DB";
  if (["K", "P"].includes(p)) return "ST";
  return "OTHER";
}

export default function RecruitingClient({ leagueId, teamId, page, pageSize, recruits }: Props) {
  const [query, setQuery] = useState("");
  const [minStars, setMinStars] = useState<number>(0);
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(recruits?.[0]?.id ?? null);

  const positions = useMemo(() => {
    const set = new Set<string>();
    recruits.forEach(r => set.add(r.pos));
    return ["ALL", ...Array.from(set).sort()];
  }, [recruits]);

  const states = useMemo(() => {
    const set = new Set<string>();
    recruits.forEach(r => {
      if (r.state) set.add(r.state);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [recruits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recruits.filter(r => {
      if (minStars > 0 && (r.stars ?? 0) < minStars) return false;
      if (posFilter !== "ALL" && r.pos !== posFilter) return false;
      if (stateFilter !== "ALL" && (r.state ?? "") !== stateFilter) return false;
      if (q) {
        const hay = `${r.name} ${r.pos} ${r.state ?? ""} ${r.archetype ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recruits, query, minStars, posFilter, stateFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];

      if (sortKey === "name" || sortKey === "pos" || sortKey === "state") {
        return asString(av).localeCompare(asString(bv)) * dir;
      }
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  const selected = useMemo(() => {
    return sorted.find(r => r.id === selectedId) ?? sorted[0] ?? null;
  }, [sorted, selectedId]);

  // Keep selection valid when filters change
  React.useEffect(() => {
    if (!selectedId) {
      setSelectedId(sorted?.[0]?.id ?? null);
      return;
    }
    const stillThere = sorted.some(r => r.id === selectedId);
    if (!stillThere) setSelectedId(sorted?.[0]?.id ?? null);
  }, [sorted, selectedId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // sensible defaults
      setSortDir(key === "name" || key === "pos" || key === "state" ? "asc" : "desc");
      if (key === "rank") setSortDir("asc");
    }
  };

  const sortBadge = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const kpi = useMemo(() => {
    const total = recruits.length;
    const shown = sorted.length;
    const avgOvr = shown ? Math.round(sorted.reduce((s, r) => s + (r.ovr ?? 0), 0) / shown) : 0;
    const fiveStars = sorted.filter(r => r.stars === 5).length;
    const fourStars = sorted.filter(r => r.stars === 4).length;
    return { total, shown, avgOvr, fiveStars, fourStars };
  }, [recruits.length, sorted]);

  const pageHref = (p: number) => {
    const next = clamp(p, 0, 9999);
    return `/league/${leagueId}/recruiting?page=${next}`;
  };

  return (
    <main style={S.page}>
      <div style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Recruiting</h1>
          <div style={S.sub}>
            League <code style={S.code}>{leagueId}</code> • Team <code style={S.code}>{teamId}</code> • Page{" "}
            <code style={S.code}>{page + 1}</code>
          </div>
        </div>

        <div style={S.nav}>
          <a style={{ ...S.btn, ...(page === 0 ? S.btnDisabled : null) }} href={pageHref(page - 1)} aria-disabled={page === 0}>
            Prev
          </a>
          <a style={S.btn} href={pageHref(page + 1)}>
            Next
          </a>
        </div>
      </div>

      <div style={S.kpiRow}>
        <KPI label="Loaded" value={`${kpi.total}`} />
        <KPI label="Showing" value={`${kpi.shown}`} />
        <KPI label="Avg OVR" value={`${kpi.avgOvr}`} />
        <KPI label="5★" value={`${kpi.fiveStars}`} />
        <KPI label="4★" value={`${kpi.fourStars}`} />
      </div>

      <section style={S.filtersCard}>
        <div style={S.filterGrid}>
          <div style={S.field}>
            <label style={S.label}>Search</label>
            <input
              style={S.input}
              placeholder="Name, pos, state, archetype…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Min Stars</label>
            <div style={S.pills}>
              {[0, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  style={{ ...S.pill, ...(minStars === n ? S.pillActive : null) }}
                  onClick={() => setMinStars(n)}
                >
                  {n === 0 ? "Any" : `${n}★+`}
                </button>
              ))}
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Position</label>
            <select style={S.select} value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>State</label>
            <select style={S.select} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Quick Sort</label>
            <div style={S.pills}>
              <button type="button" style={S.pill} onClick={() => { setSortKey("rank"); setSortDir("asc"); }}>
                Rank
              </button>
              <button type="button" style={S.pill} onClick={() => { setSortKey("stars"); setSortDir("desc"); }}>
                Stars
              </button>
              <button type="button" style={S.pill} onClick={() => { setSortKey("ovr"); setSortDir("desc"); }}>
                OVR
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={S.bodyGrid}>
        {/* Left: list */}
        <div style={S.listCard}>
          <div style={S.listHeader}>
            <div style={S.listTitle}>Recruits</div>
            <div style={S.listMeta}>{sorted.length} shown</div>
          </div>

          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <Th onClick={() => toggleSort("rank")}>Rank{sortBadge("rank")}</Th>
                  <Th onClick={() => toggleSort("name")}>Name{sortBadge("name")}</Th>
                  <Th onClick={() => toggleSort("pos")}>Pos{sortBadge("pos")}</Th>
                  <Th onClick={() => toggleSort("stars")}>Stars{sortBadge("stars")}</Th>
                  <Th onClick={() => toggleSort("ovr")}>OVR{sortBadge("ovr")}</Th>
                  <Th onClick={() => toggleSort("state")}>State{sortBadge("state")}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{ ...(active ? S.rowActive : null) }}
                    >
                      <td style={S.tdMono}>{r.rank}</td>
                      <td style={S.td}>
                        <div style={S.nameRow}>
                          <span style={S.name}>{r.name}</span>
                          <span style={S.badge}>{posGroup(r.pos)}</span>
                        </div>
                        <div style={S.muted}>{r.archetype ?? "—"}</div>
                      </td>
                      <td style={S.tdMono}>{r.pos}</td>
                      <td style={S.tdMono}>{renderStars(r.stars)}</td>
                      <td style={S.tdMono}>{r.ovr}</td>
                      <td style={S.td}>{r.state ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sorted.length === 0 && (
              <div style={S.empty}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No recruits match your filters.</div>
                <div style={{ opacity: 0.8 }}>Clear search / set Min Stars to Any / Position to ALL.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div style={S.detailCard}>
          <div style={S.detailHeader}>
            <div>
              <div style={S.detailTitle}>Recruit Detail</div>
              <div style={S.detailSub}>{selected ? "Select a recruit to view details." : "No recruit selected."}</div>
            </div>
          </div>

          {selected ? (
            <div style={S.detailBody}>
              <div style={S.detailTop}>
                <div>
                  <div style={S.bigName}>{selected.name}</div>
                  <div style={S.muted}>
                    <strong>{selected.pos}</strong> • {renderStars(selected.stars)} • OVR <strong>{selected.ovr}</strong> • Rank{" "}
                    <strong>{selected.rank}</strong>
                  </div>
                  <div style={S.muted}>
                    {selected.state ?? "—"} • {selected.archetype ?? "—"}
                  </div>
                </div>
                <div style={S.idBox}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>ID</div>
                  <div style={S.idMono}>{selected.id}</div>
                </div>
              </div>

              <div style={S.detailGrid}>
                <Info label="Offer" value={selected.offer ? JSON.stringify(selected.offer) : "—"} mono />
                <Info label="Visit" value={selected.visit ? JSON.stringify(selected.visit) : "—"} mono />
                <Info label="Top 8" value={selected.top8?.length ? JSON.stringify(selected.top8) : "—"} mono />
              </div>

              <div style={S.note}>
                Next step: we can add “Make Offer”, “Remove Offer”, “Schedule Visit” buttons here once your offer/visit tables are finalized.
              </div>
            </div>
          ) : (
            <div style={S.detailEmpty}>No recruit selected.</div>
          )}
        </div>
      </section>

      <footer style={S.footer}>
        <span style={S.footerHint}>
          Showing <strong>{sorted.length}</strong> of <strong>{recruits.length}</strong> loaded on this page (page size {pageSize}).
        </span>
      </footer>
    </main>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th style={S.th} onClick={onClick} role="button" tabIndex={0}>
      {children}
    </th>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.kpi}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value}</div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={S.info}>
      <div style={S.infoLabel}>{label}</div>
      <div style={{ ...S.infoValue, ...(mono ? S.mono : null) }}>{value}</div>
    </div>
  );
}

function renderStars(n: number) {
  const s = clamp(Number(n) || 0, 0, 5);
  return "★".repeat(s) + "☆".repeat(5 - s);
}

const S: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    background: "#ffffff",
    color: "#111",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },
  h1: { fontSize: 26, margin: 0, letterSpacing: -0.2 },
  sub: { fontSize: 13, opacity: 0.75, marginTop: 4 },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    padding: "2px 6px",
    background: "#f6f6f6",
    borderRadius: 8,
  },
  nav: { display: "flex", gap: 10 },
  btn: {
    textDecoration: "none",
    border: "1px solid #e5e5e5",
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    color: "inherit",
    background: "#fff",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  },
  btnDisabled: { opacity: 0.45, pointerEvents: "none" },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  kpi: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fafafa",
  },
  kpiLabel: { fontSize: 12, opacity: 0.7 },
  kpiValue: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },

  filtersCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    background: "#fff",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1.6fr 1fr 1fr 1.4fr",
    gap: 12,
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, opacity: 0.7, fontWeight: 700 },
  input: {
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
  },
  select: {
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    background: "#fff",
  },
  pills: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: {
    border: "1px solid #e5e5e5",
    background: "#fff",
    borderRadius: 999,
    padding: "8px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  pillActive: {
    borderColor: "#111",
    background: "#111",
    color: "#fff",
  },

  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 14,
    alignItems: "start",
  },

  listCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
  },
  listHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  listTitle: { fontWeight: 900, letterSpacing: -0.2 },
  listMeta: { fontSize: 12, opacity: 0.7 },
  tableWrap: { position: "relative" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
    background: "#fafafa",
    position: "sticky",
    top: 0,
    zIndex: 1,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f3f3", verticalAlign: "top" },
  tdMono: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f3f3",
    verticalAlign: "top",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    whiteSpace: "nowrap",
  },
  rowActive: { background: "#f5f5f5" },
  nameRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { fontWeight: 800, letterSpacing: -0.1 },
  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #e5e5e5",
    background: "#fff",
    opacity: 0.9,
    whiteSpace: "nowrap",
  },
  muted: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  empty: { padding: 16 },

  detailCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
    minHeight: 240,
  },
  detailHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  detailTitle: { fontWeight: 900, letterSpacing: -0.2 },
  detailSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  detailBody: { padding: 14 },
  detailEmpty: { padding: 14, opacity: 0.75 },
  detailTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  bigName: { fontSize: 20, fontWeight: 900, letterSpacing: -0.3, marginBottom: 4 },
  idBox: { border: "1px solid #eee", borderRadius: 14, padding: 10, background: "#fafafa", maxWidth: 260 },
  idMono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, wordBreak: "break-all" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 },
  info: { border: "1px solid #eee", borderRadius: 14, padding: 10, background: "#fff" },
  infoLabel: { fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 6 },
  infoValue: { fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  note: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    background: "#fafafa",
    border: "1px dashed #e5e5e5",
    fontSize: 12,
    opacity: 0.85,
  },

  footer: { marginTop: 14, fontSize: 12, opacity: 0.75 },
  footerHint: {},
};
