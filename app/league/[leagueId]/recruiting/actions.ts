// app/league/[leagueId]/recruiting/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

type ActionResult =
  | { ok: true; message: string; data?: any }
  | { ok: false; message: string; data?: any };

async function getAuthedContext(leagueId: string) {
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
 * Make an offer to a recruit.
 * Expected by recruiting-client.tsx: makeOfferAction
 *
 * NOTE: season is REQUIRED on insert (per your context).
 * We DO NOT write a `week` column (doesn't exist on offers).
 */
export async function makeOfferAction(
  leagueId: string,
  recruitId: string
): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedContext(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, user, league } = ctx;

  // Find user's team in this league
  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) return { ok: false, message: memErr.message };
  if (!membership?.team_id) {
    return { ok: false, message: "You are not assigned to a team in this league." };
  }

  const teamId = membership.team_id;

  // Insert offer (schema: league_id, team_id, recruit_id, season, created_by)
  const { error: insErr } = await supabase.from("recruiting_offers").insert({
    league_id: leagueId,
    team_id: teamId,
    recruit_id: recruitId,
    season: league.current_season, // REQUIRED
    created_by: user.id,
  });

  if (insErr) {
    // Common: unique constraint (already offered)
    return { ok: false, message: insErr.message };
  }

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true, message: "Offer made." };
}

/**
 * Remove an offer.
 * Expected by recruiting-client.tsx: removeOfferAction
 */
export async function removeOfferAction(
  leagueId: string,
  recruitId: string
): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };
  if (!recruitId) return { ok: false, message: "Missing recruitId." };

  const ctx = await getAuthedContext(leagueId);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const { supabase, user, league } = ctx;

  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) return { ok: false, message: memErr.message };
  if (!membership?.team_id) {
    return { ok: false, message: "You are not assigned to a team in this league." };
  }

  const teamId = membership.team_id;

  // Delete the offer for THIS team / recruit / season
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
 * Advance recruiting week.
 * Wiring for commissioner-only weekly processor.
 */
export async function advanceRecruitingWeek(leagueId: string): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };

  const ctx = await getAuthedContext(leagueId);
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
