"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAction } from "../lib/supabaseAction";

function enc(s: string) {
  return encodeURIComponent(s);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = supabaseAction();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?err=${enc(error.message)}`);
  }

  redirect(`/login?msg=${enc("Account created. If email confirmation is enabled, confirm your email then sign in.")}`);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = supabaseAction();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?err=${enc(error.message)}`);
  }

  if (!data.user) {
    redirect(`/login?err=${enc("Sign in failed. Please try again.")}`);
  }

  redirect(`/`);
}

export async function signOutAction() {
  const supabase = supabaseAction();
  await supabase.auth.signOut();
  redirect("/login?msg=" + enc("Signed out."));
}

export async function createLeagueAction(formData: FormData) {
  const name = String(formData.get("name") || "My Dynasty League").trim();
  const rawTeams = String(formData.get("teams") || "");
  const teamNames = rawTeams
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (teamNames.length < 2) {
    redirect(`/league/new?err=${enc("Add at least 2 teams.")}`);
  }

  const supabase = supabaseAction();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { data, error } = await supabase.rpc("create_league_with_teams", {
    p_name: name,
    p_team_names: teamNames
  });

  if (error) redirect(`/league/new?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function joinLeagueAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const supabase = supabaseAction();
  const { data, error } = await supabase.rpc("join_league_by_code", { p_invite_code: code });
  if (error) redirect(`/league/join?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function advanceWeekAction(leagueId: string) {
  const supabase = supabaseAction();
  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/standings`);
  revalidatePath(`/league/${leagueId}/schedule`);
  redirect(`/league/${leagueId}?msg=${enc("Week advanced.")}`);
}
import { FBS_TEAMS } from "../data/fbsTeams";
// (If your path differs, adjust to: "../../data/fbsTeams" accordingly)
// In your repo structure I provided, put `data/` at the project root (same level as `app/`).

export async function createLeagueAction(formData: FormData) {
  const name = String(formData.get("name") || "My Dynasty League").trim();
  const preset = String(formData.get("preset") || "fbs");

  const rawTeams = String(formData.get("teams") || "");
  const customTeams = rawTeams
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const SMALL_TEAMS = [
    "North Valley", "Coastal State", "Metro Tech", "Pine Ridge",
    "Capital University", "River City", "Lakeshore", "Mountain A&M"
  ];

  let teamNames: string[] = [];

  if (preset === "fbs") teamNames = FBS_TEAMS;
  else if (preset === "small") teamNames = SMALL_TEAMS;
  else teamNames = customTeams;

  if (teamNames.length < 2) {
    redirect(`/league/new?err=${enc("Add at least 2 teams.")}`);
  }

  const supabase = supabaseAction();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { data, error } = await supabase.rpc("create_league_with_teams", {
    p_name: name,
    p_team_names: teamNames
  });

  if (error) redirect(`/league/new?err=${enc(error.message)}`);

  export async function deleteLeagueAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = supabaseAction();
  const { error } = await supabase.rpc("delete_league", { p_league_id: leagueId });

  if (error) redirect(`/?err=${enc(error.message)}`);

  revalidatePath("/");
  redirect(`/?msg=${enc("League deleted.")}`);
}


  revalidatePath("/");
  redirect(`/league/${data}`);
}
