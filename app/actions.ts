"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s ?? "");
}

function leaguePath(leagueId: string, path: string) {
  return `/league/${leagueId}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Recruiting actions
 * - Top-8 board slot
 * - Offers (35 active cap enforced in SQL)
 * - Visits
 */

export async function setRecruitingBoardSlotAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const slotRaw = String(formData.get("slot") || "").trim();

  if (!leagueId) redirect("/");
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const slot = Number(slotRaw);
  if (!Number.isFinite(slot) || slot < 1 || slot > 8) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid Top-8 slot.")}`));
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_recruiting_board_slot", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_slot: slot,
    p_recruit_id: recruitId
  });

  if (error) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  }

  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Added to Top-8.")}`));
}

export async function removeRecruitFromBoardAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();

  if (!leagueId) redirect("/");
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_recruit_from_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  }

  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Removed from Top-8.")}`));
}

export async function offerScholarshipAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const seasonRaw = String(formData.get("season") || "").trim();

  if (!leagueId) redirect("/");
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const season = Number(seasonRaw || "1");
  if (!Number.isFinite(season) || season < 1) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid season.")}`));
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("offer_scholarship", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_season: season,
    p_recruit_id: recruitId
  });

  if (error) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  }

  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Scholarship offered.")}`));
}

export async function withdrawScholarshipAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const seasonRaw = String(formData.get("season") || "").trim();

  if (!leagueId) redirect("/");
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const season = Number(seasonRaw || "1");
  if (!Number.isFinite(season) || season < 1) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid season.")}`));
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("withdraw_scholarship", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_season: season,
    p_recruit_id: recruitId
  });

  if (error) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  }

  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Scholarship withdrawn.")}`));
}

export async function scheduleRecruitVisitAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const seasonRaw = String(formData.get("season") || "").trim();
  const weekRaw = String(formData.get("week") || "").trim();

  if (!leagueId) redirect("/");
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const season = Number(seasonRaw || "1");
  const week = Number(weekRaw);

  if (!Number.isFinite(season) || season < 1) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid season.")}`));
  }
  if (!Number.isFinite(week) || week < 1 || week > 20) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid visit week.")}`));
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("schedule_recruit_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_season: season,
    p_week: week,
    p_recruit_id: recruitId
  });

  if (error) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  }

  redirect(leaguePath(leagueId, `/recruiting?msg=${enc(`Visit scheduled (Week ${week}).`)}`));
}
