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

/** ✅ exported — recruiting-client imports this */
export async function makeOfferAction(args: OfferArgs): Promise<ActionResult> {
  const { leagueId, teamId, recruitId } = args ?? ({} as any);
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!teamId) return { ok: false, message: "Missing teamId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedLeague(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, league } = ctx;

  const { error } = await supabase.from("recruiting_offers").insert({
    league_id: leagueId,
    team_id: teamId,
    recruit_id: recruitId,
    season: league.current_season,
  });

  if (error) return { ok: false, message: error.message };

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

  const { error } = await supabase
    .from("recruiting_offers")
    .delete()
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .eq("recruit_id", recruitId)
    .eq("season", league.current_season);

  if (error) return { ok: false, message: error.message };

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
