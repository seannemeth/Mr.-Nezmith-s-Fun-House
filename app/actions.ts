
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAction } from "../lib/supabaseAction";
import { FBS_GENERIC } from "../data/fbsGeneric";

function enc(s: string) { return encodeURIComponent(s); }

/** ===== AUTH ===== */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  if (!email || !password) redirect(`/login?err=${enc("Email and password are required.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/?msg=${enc("Signed in.")}`);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  if (!email || !password) redirect(`/login?err=${enc("Email and password are required.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?err=${enc(error.message)}`);

  redirect(`/login?msg=${enc("Account created. If email confirmation is enabled, check your email.")}`);
}

export async function signOutAction() {
  const supabase = supabaseAction();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect(`/?msg=${enc("Signed out.")}`);
}

/** ===== LEAGUES ===== */
export async function createLeagueAction(formData: FormData) {
  const name = String(formData.get("name") || "My Dynasty League").trim();
  const preset = String(formData.get("preset") || "fbs").trim();

  const rawTeams = String(formData.get("teams") || "");
  const customTeams = rawTeams.split("\n").map(s => s.trim()).filter(Boolean);

  let teamsPayload: Array<{ name: string; short_name?: string; conference: string }> = [];

  if (preset === "fbs") {
    teamsPayload = FBS_GENERIC;
  } else if (preset === "custom") {
    teamsPayload = customTeams.map(nm => ({ name: nm, conference: "Independent" }));
  } else {
    teamsPayload = [
      { name: "Chesapeake Turtles", conference: "Chesapeake" },
      { name: "Miami Storm", conference: "Coastal" },
      { name: "Lynchburg Fires", conference: "Atlantic" },
      { name: "Austin Rangers", conference: "South" },
      { name: "Boise Peaks", conference: "Mountain" },
      { name: "Seattle Rain", conference: "Pacific" },
      { name: "Phoenix Suns", conference: "Desert" },
      { name: "Nashville Notes", conference: "South" }
    ];
  }

  if (teamsPayload.length < 2) redirect(`/league/new?err=${enc("Add at least 2 teams.")}`);

  const supabase = supabaseAction();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { data, error } = await supabase.rpc("create_league_with_structure", {
    p_name: name,
    p_teams: teamsPayload
  });

  if (error) redirect(`/league/new?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function joinLeagueAction(formData: FormData) {
  const code = String(formData.get("invite") || "").trim();
  if (!code) redirect(`/league/join?err=${enc("Invite code required.")}`);

  const supabase = supabaseAction();
  const { data, error } = await supabase.rpc("join_league_by_code", { p_invite_code: code });
  if (error) redirect(`/league/join?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function deleteLeagueAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("delete_league", { p_league_id: leagueId });
  if (error) redirect(`/?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/?msg=${enc("League deleted.")}`);
}

export async function advanceWeekAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/schedule`);
  revalidatePath(`/league/${leagueId}/standings`);
  redirect(`/league/${leagueId}?msg=${enc("Advanced week.")}`);
}

/** ===== MEMBERSHIP: TEAM + ROLE ===== */
export async function setTeamRoleAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const role = String(formData.get("role") || "").trim();

  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("set_membership_team_role", {
    p_league_id: leagueId,
    p_team_id: teamId || null,
    p_role: role
  });

  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/settings`);
  redirect(`/league/${leagueId}/settings?msg=${enc("Saved.")}`);
}

/** ===== TEAMS ===== */
export async function updateTeamAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();

  const name = String(formData.get("name") || "").trim();
  const shortName = String(formData.get("short_name") || "").trim();
  const conference = String(formData.get("conference") || "").trim();

  const prestige = Number(formData.get("prestige") || 50);
  const off = Number(formData.get("rating_off") || 50);
  const def = Number(formData.get("rating_def") || 50);
  const st = Number(formData.get("rating_st") || 50);

  if (!leagueId || !teamId) redirect(`/?err=${enc("Missing league/team id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("update_team", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_name: name,
    p_short_name: shortName,
    p_conference: conference,
    p_prestige: prestige,
    p_rating_off: off,
    p_rating_def: def,
    p_rating_st: st
  });

  if (error) redirect(`/league/${leagueId}/teams/${teamId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/teams`);
  revalidatePath(`/league/${leagueId}/teams/${teamId}`);
  redirect(`/league/${leagueId}/teams/${teamId}?msg=${enc("Team updated.")}`);
}

/** ===== RECRUITING / PORTAL / NIL / COACHES (MVP actions) ===== */
export async function initSeasonProgramsAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("init_season_programs", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}/portal`);
  revalidatePath(`/league/${leagueId}/nil`);
  revalidatePath(`/league/${leagueId}/coaches`);
  redirect(`/league/${leagueId}?msg=${enc("Season programs initialized.")}`);
}

export async function recruitingOfferAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const points = Number(formData.get("points") || 0);

  if (!leagueId || !recruitId) redirect(`/?err=${enc("Missing ids.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("recruiting_offer", {
    p_league_id: leagueId,
    p_recruit_id: recruitId,
    p_points: points
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/recruiting`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Offer submitted.")}`);
}

export async function portalBidAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const portalId = String(formData.get("portalId") || "").trim();
  const points = Number(formData.get("points") || 0);

  if (!leagueId || !portalId) redirect(`/?err=${enc("Missing ids.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("portal_bid", {
    p_league_id: leagueId,
    p_portal_id: portalId,
    p_points: points
  });

  if (error) redirect(`/league/${leagueId}/portal?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/portal`);
  redirect(`/league/${leagueId}/portal?msg=${enc("Bid submitted.")}`);
}

export async function nilDealAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const targetType = String(formData.get("targetType") || "").trim(); // recruit | portal
  const targetId = String(formData.get("targetId") || "").trim();
  const amount = Number(formData.get("amount") || 0);

  if (!leagueId || !targetType || !targetId) redirect(`/?err=${enc("Missing inputs.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("nil_offer", {
    p_league_id: leagueId,
    p_target_type: targetType,
    p_target_id: targetId,
    p_amount: amount
  });

  if (error) redirect(`/league/${leagueId}/nil?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/nil`);
  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}/portal`);
  redirect(`/league/${leagueId}/nil?msg=${enc("NIL offer submitted.")}`);
}

export async function coachUpgradeAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const track = String(formData.get("track") || "").trim(); // recruiting|offense|defense
  if (!leagueId || !track) redirect(`/?err=${enc("Missing inputs.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("coach_upgrade", {
    p_league_id: leagueId,
    p_track: track
  });

  if (error) redirect(`/league/${leagueId}/coaches?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/coaches`);
  redirect(`/league/${leagueId}/coaches?msg=${enc("Upgraded.")}`);
}
