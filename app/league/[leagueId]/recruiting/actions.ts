// app/league/[leagueId]/recruiting/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

export type ActionResult =
  | { ok: true; message: string; data?: any }
  | { ok: false; message: string; data?: any };

type OfferArgs = {
  leagueId: string;
  teamId: string;
  recruitId: string;
};

async function getAuthedLeague(leagueId: string) {
  const supabase = supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return { ok: false as const, message: userErr.message };
  if (!user) return { ok: false as const, message: "Not authenticated" };

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id, commissioner_id, current_season, current_week")
    .eq("id", leagueId)
    .single();

  if (leagueErr) return { ok: false as const, message: leagueErr.message };
  if (!league) return { ok: false as const, message: "League not found." };

  return { ok: true as const, supabase, user, league };
}

/**
 * Ensures there's a recruit_interests row so weekly processing can increment it.
 * We set a small baseline interest on first offer.
 */
async function ensureInterestRow(params: {
  supabase: ReturnType<typeof supabaseServer>;
  leagueId: string;
  season: number;
  teamId: string;
  recruitId: string;
  baselineInterest?: number;
}) {
  const {
    supabase,
    leagueId,
    season,
    teamId,
    recruitId,
    baselineInterest = 10,
  } = params;

  // Use upsert so this is safe to call repeatedly
  // NOTE: requires unique (league_id, season, team_id, recruit_id) on recruit_interests
  const { error } = await supabase.from("recruit_interests").upsert(
    {
      league_id: leagueId,
      season,
      team_id: teamId,
      recruit_id: recruitId,
      // baseline only matters on insert; on conflict we keep existing interest
      interest: baselineInterest,
      visit_applied: false,
    },
    {
      onConflict: "league_id,season,team_id,recruit_id",
      ignoreDuplicates: true, // keeps existing row untouched if already exists
    }
  );

  return { error };
}

/** ✅ exported — recruiting-client imports this */
export async function makeOfferAction(args: OfferArgs): Promise<ActionResult> {
  const { leagueId, teamId, recruitId } = args ?? ({} as any);
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!teamId) return { ok: false, message: "Missing teamId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, league } = ctx;

  // 1) Insert (or ignore) the offer
  // NOTE: requires unique (league_id, season, team_id, recruit_id) on recruiting_offers
  const { error: offerErr } = await supabase.from("recruiting_offers").upsert(
    {
      league_id: leagueId,
      team_id: teamId,
      recruit_id: recruitId,
      season: league.current_season,
      // weekly_boost optional: if column exists in your table, you can set it here.
      // weekly_boost: 1,
    },
    {
      onConflict: "league_id,season,team_id,recruit_id",
      ignoreDuplicates: true,
    }
  );

  if (offerErr) return { ok: false, message: offerErr.message };

  // 2) Ensure interest row exists so process_recruiting_week_v1 can increment
  const { error: interestErr } = await ensureInterestRow({
    supabase,
    leagueId,
    season: league.current_season,
    teamId,
    recruitId,
    baselineInterest: 10,
  });

  if (interestErr) return { ok: false, message: interestErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true, message: "Offer made." };
}

/** ✅ exported — recruiting-client imports this */
export async function removeOfferAction(args: OfferArgs): Promise<ActionResult> {
  const { leagueId, teamId, recruitId } = args ?? ({} as any);
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!teamId) return { ok: false, message: "Missing teamId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, league } = ctx;

  // Delete offer
  const { error: offerErr } = await supabase
    .from("recruiting_offers")
    .delete()
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .eq("recruit_id", recruitId)
    .eq("season", league.current_season);

  if (offerErr) return { ok: false, message: offerErr.message };

  // Optional but recommended: delete interest row too (keeps your data clean)
  // If you want interest to persist even after offer removal, delete this block.
  const { error: interestErr } = await supabase
    .from("recruit_interests")
    .delete()
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .eq("recruit_id", recruitId)
    .eq("season", league.current_season);

  if (interestErr) return { ok: false, message: interestErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true, message: "Offer removed." };
}

/** ✅ exported — AdvanceWeekButton should call this */
export async function advanceRecruitingWeek(leagueId: string): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, user, league } = ctx;

  if (league.commissioner_id !== user.id) {
    return { ok: false, message: "Only the commissioner can advance the week." };
  }

  const { data, error } = await supabase.rpc("process_recruiting_week_v1", {
    p_league_id: leagueId,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}`);

  return { ok: true, message: "Week advanced successfully.", data };
}
