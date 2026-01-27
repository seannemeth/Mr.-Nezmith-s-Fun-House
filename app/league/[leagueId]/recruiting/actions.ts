// app/league/[leagueId]/recruiting/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

type ActionResult =
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
  if (!user) return { ok: false as const, message: "Not signed in." };

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
 * Expected by recruiting-client.tsx:
 *   await makeOfferAction({ leagueId, teamId, recruitId })
 */
export async function makeOfferAction(args: OfferArgs): Promise<ActionResult> {
  const { leagueId, teamId, recruitId } = args ?? ({} as any);
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!teamId) return { ok: false, message: "Missing teamId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, user, league } = ctx;

  // Insert offer (season is REQUIRED; do NOT write a week column)
  const { error: insErr } = await supabase.from("recruiting_offers").insert({
    league_id: leagueId,
    team_id: teamId,
    recruit_id: recruitId,
    season: league.current_season,
    created_by: user.id,
  });

  if (insErr) return { ok: false, message: insErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true, message: "Offer made." };
}

/**
 * Expected by recruiting-client.tsx:
 *   await removeOfferAction({ leagueId, teamId, recruitId })
 */
export async function removeOfferAction(args: OfferArgs): Promise<ActionResult> {
  const { leagueId, teamId, recruitId } = args ?? ({} as any);
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!teamId) return { ok: false, message: "Missing teamId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, league } = ctx;

  const { error: delErr } = await supabase
    .from("recruiting_offers")
    .delete()
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .eq("recruit_id", recruitId)
    .eq("season", league.current_season);

  if (delErr) return { ok: false, message: delErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true, message: "Offer removed." };
}

/**
 * Called by AdvanceWeekButton:
 *   await advanceRecruitingWeek(leagueId)
 */
export async function advanceRecruitingWeek(leagueId: string): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, user, league } = ctx;

  if (league.commissioner_id !== user.id) {
    return { ok: false, message: "Only the commissioner can advance the week." };
  }

  const { data: summary, error: rpcErr } = await supabase.rpc(
    "process_recruiting_week_v1",
    { p_league_id: leagueId }
  );

  if (rpcErr) return { ok: false, message: rpcErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}`);

  return { ok: true, message: "Week advanced successfully.", data: summary };
}
