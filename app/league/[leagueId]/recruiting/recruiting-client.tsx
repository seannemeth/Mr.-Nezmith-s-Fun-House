"use client";

// app/league/[leagueId]/recruiting/recruiting-client.tsx
import * as React from "react";
import { makeOfferAction, removeOfferAction } from "./actions";

export type RecruitRow = {
  id: string;
  name: string;
  pos: string | null;
  stars: number | null;
  rank: number | null;
  state: string | null;
  archetype: string | null;
  ovr: number | null;

  // treat "truthy" as offered
  offer?: any;
  visit?: any;
  top8?: any;
};

type Props = {
  leagueId: string;
  teamId: string;
  initialRecruits: RecruitRow[];
};

type SortKey = "rank" | "stars" | "ovr" | "name" | "pos" | "state";

export default function RecruitingClient({ leagueId, teamId, initialRecruits }: Props) {
  const [recruits, setRecruits] = React.useState<RecruitRow[]>(initialRecruits);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialRecruits?.[0]?.id ?? null
  );

  const [query, setQuery] = React.useState("");
  const [minStars, setMinStars] = React.useState<number>(0);
  const [posFilter, setPosFilter] = React.useState<string>("ALL");
  const [stateFilter, setStateFilter] = React.useState<string>("ALL");

  const [sortKey, setSortKey] = React.useState<SortKey>("rank");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const [isPending, startTransition] = React.useTransition();
  const [toast, setToast] = React.useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  const selected = React.useMemo(
    () => recruits.find((r) => r.id === selectedId) ?? null,
    [recruits, selectedId]
  );

  const positions = React.useMemo(() => {
    const set = new Set<string>();
    recruits.forEach((r) => {
      const p = (r.pos ?? "").trim();
      if (p) set.add(p);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [recruits]);

  const states = React.useMemo(() => {
    const set = new Set<string>();
    recruits.forEach((r) => {
      const s = (r.state ?? "").trim();
      if (s) set.add(s);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [recruits]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return recruits.filter((r) => {
      if (minStars > 0 && (r.stars ?? 0) < minStars) return false;
      if (posFilter !== "ALL" && (r.pos ?? "") !== posFilter) return false;
      if (stateFilter !== "ALL" && (r.state ?? "") !== stateFilter) return false;

      if (q) {
        const hay = `${r.name ?? ""} ${r.pos ?? ""} ${r.state ?? ""} ${r.archetype ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recruits, query, minStars, posFilter, stateFilter]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(pageCount, Math.max(1, page));

  const paged = React.useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe]);

  React.useEffect(() => {
    setPage(1);
  }, [query, minStars, posFilter, stateFilter]);

  React.useEffect(() => {
    if (selectedId && recruits.some((r) => r.id === selectedId)) return;
    setSelectedId(recruits?.[0]?.id ?? null);
  }, [recruits, selectedId]);

  async function toggleOffer(recruit: RecruitRow) {
    setToast(null);

    startTransition(async () => {
      const hasOffer = !!recruit.offer;

      // NOTE: We intentionally treat the action result as unknown-ish
      // and guard access to .message to avoid TS narrowing issues.
      const res: any = hasOffer
        ? await removeOfferAction({ leagueId, teamId, recruitId: recruit.id })
        : await makeOfferAction({ leagueId, teamId, recruitId: recruit.id });

      if (!res || res.ok !== true) {
        const msg =
          res && typeof res === "object" && "message" in res
            ? String((res as any).message)
            : "Offer action failed.";
        setToast({ type: "err", msg });
        return;
      }

      // Optimistic UI flip
      setRecruits((prev) =>
        prev.map((r) => (r.id === recruit.id ? { ...r, offer: hasOffer ? null : true } : r))
      );

      setToast({ type: "ok", msg: hasOffer ? "Offer removed." : "Offer made." });
    });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Recruiting</h1>

        <div className="text-xs text-black/60">
          League: <span className="font-mono">{leagueId}</span> • Team:{" "}
          <span className="font-mono">{teamId}</span>
        </div>
      </div>

      {toast && (
        <div
          className={[
            "mt-3 rounded border px-3 py-2 text-sm",
            toast.type === "ok" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50",
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: list */}
        <div className="lg:col-span-7 rounded border bg-white">
          <div className="p-3 border-b bg-black/2 flex flex-wrap gap-2 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name / archetype / state…"
              className="px-3 py-2 rounded border text-sm w-full md:w-72"
            />

            <select
              value={minStars}
              onChange={(e) => setMinStars(Number(e.target.value))}
              className="px-3 py-2 rounded border text-sm"
            >
              <option value={0}>All Stars</option>
              <option value={1}>1★+</option>
              <option value={2}>2★+</option>
              <option value={3}>3★+</option>
              <option value={4}>4★+</option>
              <option value={5}>5★</option>
            </select>

            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="px-3 py-2 rounded border text-sm"
            >
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All Positions" : p}
                </option>
              ))}
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 rounded border text-sm"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All States" : s}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2 text-xs text-black/60">
              <span>
                {filtered.length.toLocaleString()} / {recruits.length.toLocaleString()}
              </span>
              {isPending && <span className="font-medium">Working…</span>}
            </div>
          </div>

          <div className="px-3 py-2 border-b text-xs text-black/60 grid grid-cols-12 gap-2">
            <HeaderCell label="Rank" k="rank" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
            <HeaderCell label="Name" k="name" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} className="col-span-4" />
            <HeaderCell label="Pos" k="pos" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
            <HeaderCell label="St" k="state" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
            <HeaderCell label="★" k="stars" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
            <HeaderCell label="OVR" k="ovr" sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} />
            <div className="col-span-2 text-right pr-2">Offer</div>
          </div>

          <div className="divide-y">
            {paged.map((r) => {
              const isSel = r.id === selectedId;
              const offered = !!r.offer;

              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={[
                    "w-full text-left px-3 py-2 grid grid-cols-12 gap-2 items-center text-sm",
                    isSel ? "bg-black/5" : "bg-white hover:bg-black/3",
                  ].join(" ")}
                >
                  <div className="col-span-1 font-mono text-xs text-black/70">{fmt(r.rank)}</div>
                  <div className="col-span-4">
                    <div className="font-medium leading-tight">{r.name}</div>
                    <div className="text-xs text-black/60">{r.archetype ?? ""}</div>
                  </div>
                  <div className="col-span-1 font-mono text-xs">{r.pos ?? "-"}</div>
                  <div className="col-span-1 font-mono text-xs">{r.state ?? "-"}</div>
                  <div className="col-span-1 font-mono text-xs">{fmt(r.stars)}</div>
                  <div className="col-span-1 font-mono text-xs">{fmt(r.ovr)}</div>

                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span
                      className={[
                        "text-[11px] px-2 py-1 rounded border",
                        offered ? "bg-green-50 border-green-300" : "bg-white border-black/15",
                      ].join(" ")}
                    >
                      {offered ? "Offered" : "—"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t flex items-center justify-between text-sm">
            <button
              className="px-3 py-2 rounded border disabled:opacity-50"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <div className="text-xs text-black/60">
              Page {pageSafe} / {pageCount}
            </div>

            <button
              className="px-3 py-2 rounded border disabled:opacity-50"
              disabled={pageSafe >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>

        {/* RIGHT: detail */}
        <div className="lg:col-span-5 rounded border bg-white">
          <div className="p-4 border-b">
            <div className="text-xs text-black/60">Recruit Detail</div>
            <div className="mt-1 text-lg font-semibold">{selected?.name ?? "—"}</div>
            <div className="mt-1 text-sm text-black/70">
              {selected?.pos ?? "-"} • {selected?.state ?? "-"} • {fmt(selected?.stars)}★ • OVR{" "}
              {fmt(selected?.ovr)}
            </div>
            {selected?.archetype && (
              <div className="mt-2 text-xs text-black/60">{selected.archetype}</div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {!selected ? (
              <div className="text-sm text-black/60">Select a recruit.</div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  Offer status:{" "}
                  <span className="font-medium">{selected.offer ? "Offered" : "Not offered"}</span>
                </div>

                <button
                  disabled={isPending}
                  onClick={() => toggleOffer(selected)}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50"
                >
                  {selected.offer ? "Remove Offer" : "Make Offer"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSortValue(r: RecruitRow, key: SortKey) {
  switch (key) {
    case "rank":
      return r.rank ?? null;
    case "stars":
      return r.stars ?? null;
    case "ovr":
      return r.ovr ?? null;
    case "name":
      return r.name ?? "";
    case "pos":
      return r.pos ?? "";
    case "state":
      return r.state ?? "";
    default:
      return null;
  }
}

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function HeaderCell(props: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  setSortKey: (k: SortKey) => void;
  setSortDir: (d: "asc" | "desc") => void;
  className?: string;
}) {
  const active = props.sortKey === props.k;

  return (
    <button
      className={["col-span-1 text-left hover:underline", props.className ?? ""].join(" ")}
      onClick={() => {
        if (!active) {
          props.setSortKey(props.k);
          props.setSortDir("asc");
        } else {
          props.setSortDir(props.sortDir === "asc" ? "desc" : "asc");
        }
      }}
      type="button"
    >
      {props.label} {active ? (props.sortDir === "asc" ? "▲" : "▼") : ""}
    </button>
  );
}
