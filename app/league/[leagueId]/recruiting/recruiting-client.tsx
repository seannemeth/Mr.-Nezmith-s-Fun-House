// app/league/[leagueId]/recruiting/recruiting-client.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type UUID = string;

type RecruitRow = {
  id: UUID; // kept internally, NEVER rendered
  name: string;
  position: string;
  stars: number;
  archetype: string | null;
  height_in: number | null;
  weight_lb: number | null;

  // optional fields you might already have
  interest?: number | null; // "My Interest" if you compute it
  offered?: boolean | null;
  on_board?: boolean | null;
};

type FinanceRow = {
  cash_balance: number;
  season: number;
  week: number;
};

type ContactType = 'text' | 'dm' | 'social' | 'call' | 'coach_visit' | 'home_visit';

const CONTACT_TYPES: { key: ContactType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'dm', label: 'DM' },
  { key: 'social', label: 'Social' },
  { key: 'call', label: 'Call' },
  { key: 'coach_visit', label: 'Coach Visit' },
  { key: 'home_visit', label: 'Home Visit' },
];

// Uses env vars (standard Next.js)
function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatHeight(inches: number | null) {
  if (!inches || inches <= 0) return '—';
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

function formatWeight(lb: number | null) {
  if (!lb || lb <= 0) return '—';
  return `${lb} lb`;
}

type SortKey =
  | 'name'
  | 'position'
  | 'archetype'
  | 'height_in'
  | 'weight_lb'
  | 'stars'
  | 'interest';

export default function RecruitingClient({
  leagueId,
  teamId,
}: {
  leagueId: UUID;
  teamId: UUID;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [finance, setFinance] = useState<FinanceRow | null>(null);
  const [recruits, setRecruits] = useState<RecruitRow[]>([]);

  const [expanded, setExpanded] = useState<UUID | null>(null);

  // contacts used state
  const [weeklyUsed, setWeeklyUsed] = useState<number>(0);
  const [usedContacts, setUsedContacts] = useState<Record<string, boolean>>({});

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>('stars');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const season = finance?.season ?? 1;
  const week = finance?.week ?? 1;

  function usedKey(recruitId: UUID, contactType: ContactType) {
    // internal key only, never displayed
    return `${recruitId}:${contactType}`;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      // 1) finance header data (cash/season/week)
      // NOTE: adjust query if your team_finances schema differs
      const { data: fin, error: finErr } = await supabase
        .from('team_finances')
        .select('cash_balance, season, week')
        .eq('league_id', leagueId)
        .eq('team_id', teamId)
        .order('season', { ascending: false })
        .order('week', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (finErr) throw finErr;
      if (!fin) {
        setFinance({ cash_balance: 0, season: 1, week: 1 });
      } else {
        setFinance(fin as FinanceRow);
      }

      const resolvedSeason = (fin as FinanceRow | null)?.season ?? 1;
      const resolvedWeek = (fin as FinanceRow | null)?.week ?? 1;

      // 2) recruit list
      // NOTE: adjust fields to match your recruits table/view
      const { data: recs, error: recErr } = await supabase
        .from('recruits')
        .select('id, name, position, stars, archetype, height_in, weight_lb')
        .eq('league_id', leagueId)
        .order('stars', { ascending: false })
        .limit(500);

      if (recErr) throw recErr;

      const mapped: RecruitRow[] = (recs ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Unknown',
        position: r.position ?? '—',
        stars: Number(r.stars ?? 0),
        archetype: r.archetype ?? null,
        height_in: r.height_in ?? null,
        weight_lb: r.weight_lb ?? null,
        interest: null,
        offered: null,
        on_board: null,
      }));

      setRecruits(mapped);

      // 3) load used contacts for current season/week
      const { data: contacts, error: cErr } = await supabase
        .from('recruiting_contacts')
        .select('recruit_id, contact_type')
        .eq('league_id', leagueId)
        .eq('team_id', teamId)
        .eq('season', resolvedSeason)
        .eq('week', resolvedWeek);

      if (cErr) throw cErr;

      const used: Record<string, boolean> = {};
      (contacts ?? []).forEach((c: any) => {
        used[usedKey(c.recruit_id, c.contact_type)] = true;
      });
      setUsedContacts(used);
      setWeeklyUsed((contacts ?? []).length);

      setExpanded(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load recruiting data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, teamId]);

  function toggleSort(next: SortKey) {
    if (sortKey === next) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(next);
      setSortDir(next === 'name' ? 'asc' : 'desc');
    }
  }

  const sortedRecruits = useMemo(() => {
    const copy = [...recruits];
    const dir = sortDir === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];

      // strings
      if (typeof av === 'string' || typeof bv === 'string') {
        const as = (av ?? '').toString().toLowerCase();
        const bs = (bv ?? '').toString().toLowerCase();
        if (as < bs) return -1 * dir;
        if (as > bs) return 1 * dir;
        return 0;
      }

      // numbers/nulls
      const an = Number(av ?? -Infinity);
      const bn = Number(bv ?? -Infinity);
      if (an < bn) return -1 * dir;
      if (an > bn) return 1 * dir;
      return 0;
    });

    return copy;
  }, [recruits, sortKey, sortDir]);

  async function applyContact(recruitId: UUID, contactType: ContactType) {
    const k = usedKey(recruitId, contactType);
    if (usedContacts[k]) return; // hard client guard

    // Optimistic: mark used immediately to prevent double-click
    setUsedContacts((prev) => ({ ...prev, [k]: true }));
    setWeeklyUsed((n) => n + 1);

    try {
      const { error: rpcErr } = await supabase.rpc('recruiting_apply_contact_v1', {
        p_league_id: leagueId,
        p_team_id: teamId,
        p_recruit_id: recruitId,
        p_season: season,
        p_week: week,
        p_contact_type: contactType,
      });

      if (rpcErr) {
        // If DB says unique constraint, keep UI used anyway.
        // If it's a different error, revert.
        const msg = (rpcErr.message ?? '').toLowerCase();
        const isUnique =
          msg.includes('duplicate key') || msg.includes('unique') || msg.includes('recruiting_contacts_unique_weekly');

        if (!isUnique) {
          setUsedContacts((prev) => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
          setWeeklyUsed((n) => Math.max(0, n - 1));
          throw rpcErr;
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to apply contact');
    }
  }

  async function toggleOffer(recruitId: UUID) {
    try {
      const { error: rpcErr } = await supabase.rpc('recruiting_toggle_offer_paid_v1', {
        p_league_id: leagueId,
        p_team_id: teamId,
        p_recruit_id: recruitId,
        p_season: season,
        p_week: week,
      });
      if (rpcErr) throw rpcErr;

      // Refresh row state (simple reload)
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to toggle offer');
    }
  }

  async function toggleBoard(recruitId: UUID) {
    try {
      // Upsert ignoreDuplicates pattern (assumes recruiting_board table exists)
      const { error: upErr } = await supabase
        .from('recruiting_board')
        .upsert(
          {
            league_id: leagueId,
            team_id: teamId,
            recruit_id: recruitId,
            season,
            week,
          },
          { onConflict: 'league_id,team_id,recruit_id', ignoreDuplicates: true }
        );

      if (upErr) throw upErr;

      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add to board');
    }
  }

  // ---- UI helpers
  const headerCash = finance ? `$${(finance.cash_balance ?? 0).toLocaleString()}` : '—';

  // Make table horizontally scrollable and ensure right actions not clipped
  // Sticky right column keeps Offer/Board visible
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border px-3 py-2">
            <div className="text-xs opacity-70">Cash</div>
            <div className="text-lg font-semibold">{headerCash}</div>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <div className="text-xs opacity-70">Season / Week</div>
            <div className="text-lg font-semibold">
              {season} / {week}
            </div>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <div className="text-xs opacity-70">Contacts Used</div>
            <div className="text-lg font-semibold">{weeklyUsed}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
            onClick={() => loadAll()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Scroll container fixes "right side cut off" */}
      <div className="w-full overflow-x-auto rounded-xl border">
        {/* Give the grid a minimum width so columns don’t crush, and allow scrolling */}
        <div className="min-w-[1100px]">
          {/* Table header */}
          <div
            className="grid items-center gap-2 border-b bg-black/5 px-3 py-2 text-xs font-semibold"
            style={{
              gridTemplateColumns:
                'minmax(220px, 2fr) 90px 140px 90px 90px 90px minmax(260px, 1fr) 220px',
            }}
          >
            <button className="text-left hover:underline" onClick={() => toggleSort('name')}>
              Recruit {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('position')}>
              Pos {sortKey === 'position' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('archetype')}>
              Archetype {sortKey === 'archetype' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('height_in')}>
              Ht {sortKey === 'height_in' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('weight_lb')}>
              Wt {sortKey === 'weight_lb' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('stars')}>
              Stars {sortKey === 'stars' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="text-left hover:underline" onClick={() => toggleSort('interest')}>
              My Interest {sortKey === 'interest' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>

            {/* Sticky Actions header */}
            <div className="sticky right-0 bg-black/5 pl-2">
              Actions
            </div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="px-3 py-6 text-sm opacity-70">Loading recruits…</div>
          ) : (
            <div>
              {sortedRecruits.map((r) => {
                const isOpen = expanded === r.id;

                return (
                  <div key={r.id} className="border-b">
                    {/* Row */}
                    <div
                      className="grid items-center gap-2 px-3 py-2 text-sm"
                      style={{
                        gridTemplateColumns:
                          'minmax(220px, 2fr) 90px 140px 90px 90px 90px minmax(260px, 1fr) 220px',
                      }}
                    >
                      <button
                        className="text-left font-semibold hover:underline"
                        onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                        title="Expand recruit"
                      >
                        {r.name}
                      </button>

                      <div>{r.position}</div>
                      <div className="truncate">{r.archetype ?? '—'}</div>
                      <div>{formatHeight(r.height_in)}</div>
                      <div>{formatWeight(r.weight_lb)}</div>
                      <div>{r.stars ? '★'.repeat(clamp(r.stars, 0, 5)) : '—'}</div>
                      <div>{r.interest ?? '—'}</div>

                      {/* Sticky right action cell (prevents cut-off) */}
                      <div className="sticky right-0 bg-white pl-2">
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
                            onClick={() => toggleOffer(r.id)}
                          >
                            Make Offer
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
                            onClick={() => toggleBoard(r.id)}
                          >
                            Add Board
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div className="bg-black/2 px-3 pb-3">
                        {/* IMPORTANT: no IDs shown here */}
                        <div className="grid gap-3 pt-2 md:grid-cols-2">
                          {/* Contacts */}
                          <div className="rounded-xl border bg-white p-3">
                            <div className="mb-2 text-xs font-semibold opacity-70">Contacts</div>
                            <div className="flex flex-wrap gap-2">
                              {CONTACT_TYPES.map((c) => {
                                const k = usedKey(r.id, c.key);
                                const used = !!usedContacts[k];

                                return (
                                  <button
                                    key={c.key}
                                    className={[
                                      'rounded-lg border px-3 py-2 text-xs',
                                      used
                                        ? 'cursor-not-allowed bg-green-50 text-green-800 border-green-300'
                                        : 'hover:bg-black/5',
                                    ].join(' ')}
                                    disabled={used}
                                    onClick={() => applyContact(r.id, c.key)}
                                  >
                                    {c.label} {used ? '✓' : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Visits (hook your existing RPCs if you want) */}
                          <div className="rounded-xl border bg-white p-3">
                            <div className="mb-2 text-xs font-semibold opacity-70">Official Visit</div>
                            <div className="text-xs opacity-70">
                              If you already have your visit scheduler RPC wired elsewhere, keep it there. This panel is
                              intentionally ID-free.
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                className="rounded-lg border px-3 py-2 text-xs hover:bg-black/5"
                                onClick={async () => {
                                  try {
                                    const { error: rpcErr } = await supabase.rpc('schedule_recruit_visit_paid_v1', {
                                      p_league_id: leagueId,
                                      p_team_id: teamId,
                                      p_recruit_id: r.id,
                                      p_season: season,
                                      p_week: week,
                                    });
                                    if (rpcErr) throw rpcErr;
                                    await loadAll();
                                  } catch (e: any) {
                                    setError(e?.message ?? 'Failed to schedule visit');
                                  }
                                }}
                              >
                                Schedule Visit
                              </button>

                              <button
                                className="rounded-lg border px-3 py-2 text-xs hover:bg-black/5"
                                onClick={async () => {
                                  try {
                                    const { error: rpcErr } = await supabase.rpc('remove_recruit_visit_v1', {
                                      p_league_id: leagueId,
                                      p_team_id: teamId,
                                      p_recruit_id: r.id,
                                      p_season: season,
                                      p_week: week,
                                    });
                                    if (rpcErr) throw rpcErr;
                                    await loadAll();
                                  } catch (e: any) {
                                    setError(e?.message ?? 'Failed to remove visit');
                                  }
                                }}
                              >
                                Remove Visit
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* bottom padding */}
                        <div className="h-2" />
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedRecruits.length === 0 && (
                <div className="px-3 py-6 text-sm opacity-70">No recruits found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs opacity-60">
        Tip: If your screen is narrow, swipe/scroll horizontally — the Actions column stays pinned on the right.
      </div>
    </div>
  );
}
