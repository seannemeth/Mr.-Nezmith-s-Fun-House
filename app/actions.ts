"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAction } from "../lib/supabaseAction";
import { FBS_GENERIC } from "../data/fbsGeneric";

function enc(s: string) { return encodeURIComponent(s); }

/** AUTH */
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

  revalidatePath("/");
  redirect(`/login?msg=${enc("Account created. Check email if confirmation is enabled.")}`);
}

export async function signOutAction() {
  const supabase = supabaseAction();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect(`/?msg=${enc("Signed out.")}`);
}

/** LEAGUES */
export async function createLeagueAction(formData: FormData) {
  const name = String(formData.get("name") || "My Dynasty League").trim();
  const preset = String(formData.get("preset") || "fbs").trim();

  const rawTeams = String(formData.get("teams") || "");
  const customTeams = rawTeams.split("\n").map(s => s.trim()).filter(Boolean);

  let teamsPayload: Array<{ name: string; short_name?: string; conference: string }> = [];
  if (preset === "custom") {
    teamsPayload = customTeams.map(nm => ({ name: nm, conference: "Independent" }));
  } else if (preset === "small") {
    teamsPayload = [
      { name: "Chesapeake Turtles", conference: "Independent" },
      { name: "Miami Storm", conference: "Independent" },
      { name: "Lynchburg Fires", conference: "Independent" },
      { name: "Austin Rangers", conference: "Independent" },
      { name: "Boise Peaks", conference: "Independent" },
      { name: "Seattle Rain", conference: "Independent" },
      { name: "Phoenix Suns", conference: "Independent" },
      { name: "Nashville Notes", conference: "Independent" }
    ];
  } else {
    teamsPayload = FBS_GENERIC;
  }

  if (teamsPayload.length < 2) redirect(`/league/new?err=${enc("Add at least 2 teams.")}`);

  const supabase = supabaseAction();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { data, error } = await supabase.rpc("create_league_with_structure", { p_name: name, p_teams: teamsPayload });
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

export async function advanceWeekAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}`);
  redirect(`/league/${leagueId}?msg=${enc("Advanced week.")}`);
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

export async function updateTeamAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();

  const name = String(formData.get("name") || "").trim();
  const shortName = String(formData.get("short_name") || "").trim();
  const prestige = Number(formData.get("prestige") || 50);
  const off = Number(formData.get("rating_off") || 50);
  const def = Number(formData.get("rating_def") || 50);
  const st = Number(formData.get("rating_st") || 50);

  if (!leagueId || !teamId) redirect(`/?err=${enc("Missing league/team id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("update_team", {
    p_league_id: leagueId, p_team_id: teamId, p_name: name, p_short_name: shortName,
    p_prestige: prestige, p_rating_off: off, p_rating_def: def, p_rating_st: st
  });
  if (error) redirect(`/league/${leagueId}/teams/${teamId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}/teams`);
  revalidatePath(`/league/${leagueId}/teams/${teamId}`);
  redirect(`/league/${leagueId}/teams/${teamId}?msg=${enc("Team updated.")}`);
}
