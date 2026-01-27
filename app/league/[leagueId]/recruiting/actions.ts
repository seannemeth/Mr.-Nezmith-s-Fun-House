// app/league/[leagueId]/recruiting/actions.ts
"use server";

import { supabaseServer } from "../../../../lib/supabaseServer";

type TryResult = { ok: true } | { ok: false; message: string };

function errMsg(e: any) {
  return e?.message ?? e?.error_description ?? String(e);
}

/**
 * Tries multiple payload shapes to tolerate schema differences.
 * Returns first success; otherwise returns the last error.
 */
async function tryUpsert(
  table: string,
  payloadVariants: Record<string, any>[],
  conflictTargetsVariants: string[][]
): Promise<TryResult> {
  const supabase = supabaseServer();

  let lastError: any = null;

  for (let i = 0; i < payloadVariants.length; i++) {
    const payload = payloadVariants[i];

    // Try each conflict target set for this payload
    for (let j = 0; j < conflictTargetsVariants.length; j++) {
      const onConflict = conflictTargetsVariants[j].join(",");

      const { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict });

      if (!error) return { ok: true };
      lastError = error;
    }

    // Also try plain insert (some schemas don't allow upsert or have no unique index)
    const { error: insertErr } = await supabase.from(table).insert(payload);
    if (!insertErr) return { ok: true };
    lastError = insertErr;
  }

  return { ok: false, message: errMsg(lastError) };
}

async function tryDelete(
  table: string,
  whereVariants: Record<string, any>[]
): Promise<TryResult> {
  const supabase = supabaseServer();
  let lastError: any = null;

  for (const where of whereVariants) {
    let q: any = supabase.from(table).delete();
    Object.entries(where).forEach(([k, v]) => (q = q.eq(k, v)));
    const { error } = await q;
    if (!error) return { ok: true };
    lastError = error;
  }

  return { ok: false, message: errMsg(lastError) };
}

/**
 * Offer: create/update the row linking (league, team, recruit)
 * amount is optional; you can later map to points/NIL/etc.
 */
export async function makeOfferAction(args: {
  leagueId: string;
  teamId: string;
  recruitId: string;
  amount?: number | null;
}) {
  const { leagueId, teamId, recruitId, amount } = args;

  // Common payload shapes we might have in different schema versions
  const payloads: Record<string, any>[] = [
    // Variant A: league_id/team_id/recruit_id + amount
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, amount: amount ?? null },

    // Variant B: league_id/team_id/recruit_id + offer_amount
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, offer_amount: amount ?? null },

    // Variant C: league_id/team_id/recruit_id + points
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, points: amount ?? null },

    // Variant D: some older schemas use committed_team_id or recruit_uuid (rare but seen)
    { league_id: leagueId, team_id: teamId, recruit_uuid: recruitId, amount: amount ?? null },
  ];

  // Common unique keys for upsert (depends on your indexes)
  const conflictTargets: string[][] = [
    ["league_id", "team_id", "recruit_id"],
    ["league_id", "recruit_id", "team_id"],
    ["team_id", "recruit_id"],
    ["league_id", "team_id", "recruit_uuid"],
  ];

  const res = await tryUpsert("recruiting_offers", payloads, conflictTargets);

  if (!res.ok) {
    throw new Error(`makeOfferAction failed: ${res.message}`);
  }

  return { ok: true };
}

export async function removeOfferAction(args: {
  leagueId: string;
  teamId: string;
  recruitId: string;
}) {
  const { leagueId, teamId, recruitId } = args;

  const whereVariants: Record<string, any>[] = [
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId },
    { team_id: teamId, recruit_id: recruitId },
    { league_id: leagueId, team_id: teamId, recruit_uuid: recruitId },
  ];

  const res = await tryDelete("recruiting_offers", whereVariants);

  if (!res.ok) {
    throw new Error(`removeOfferAction failed: ${res.message}`);
  }

  return { ok: true };
}

/**
 * Visit: schedule a visit week (number) or date string (optional)
 * You can later expand to "week", "type", "bonus", etc.
 */
export async function scheduleVisitAction(args: {
  leagueId: string;
  teamId: string;
  recruitId: string;
  week?: number | null; // e.g., 1..15
  visitDate?: string | null; // ISO string if you prefer
}) {
  const { leagueId, teamId, recruitId, week, visitDate } = args;

  const payloads: Record<string, any>[] = [
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, week: week ?? null, visit_date: visitDate ?? null },
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, visit_week: week ?? null, visit_date: visitDate ?? null },
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, week_number: week ?? null, date: visitDate ?? null },
    { league_id: leagueId, team_id: teamId, recruit_uuid: recruitId, week: week ?? null, visit_date: visitDate ?? null },
  ];

  const conflictTargets: string[][] = [
    ["league_id", "team_id", "recruit_id"],
    ["team_id", "recruit_id"],
    ["league_id", "team_id", "recruit_uuid"],
  ];

  const res = await tryUpsert("recruit_visits", payloads, conflictTargets);

  if (!res.ok) {
    throw new Error(`scheduleVisitAction failed: ${res.message}`);
  }

  return { ok: true };
}

export async function cancelVisitAction(args: {
  leagueId: string;
  teamId: string;
  recruitId: string;
}) {
  const { leagueId, teamId, recruitId } = args;

  const whereVariants: Record<string, any>[] = [
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId },
    { team_id: teamId, recruit_id: recruitId },
    { league_id: leagueId, team_id: teamId, recruit_uuid: recruitId },
  ];

  const res = await tryDelete("recruit_visits", whereVariants);

  if (!res.ok) {
    throw new Error(`cancelVisitAction failed: ${res.message}`);
  }

  return { ok: true };
}
