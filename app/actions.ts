"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const sb = supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?err=${enc(error.message)}`);
  redirect(`/`);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const sb = supabaseServer();
  const { error } = await sb.auth.signUp({ email, password });

  if (error) redirect(`/login?err=${enc(error.message)}`);
  redirect(`/login?ok=${enc("Check your email to confirm your account, then sign in.")}`);
}

export async function signOutAction() {
  const sb = supabaseServer();
  await sb.auth.signOut();
  redirect("/login?ok=" + enc("Signed out."));
}

export async function createLeagueAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(`/league/new?err=${enc("League name is required.")}`);

  const sb = supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { TEAM_PRESET_FBS_GENERIC } = await import("../lib/teamPresets");
  const teamNames = TEAM_PRESET_FBS_GENERIC.conferences.flatMap(c => c.teams.map(t => t.name));

  const { data, error } = await sb.rpc("create_league_with_teams", {
    p_name: name,
    p_team_names: teamNames,
  });

  if (error) redirect(`/league/new?err=${enc(error.message)}`);

  redirect(`/league/${String(data)}`);
}

export async function deleteLeagueAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const sb = supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) redirect(`/login?err=${enc("Please sign in.")}`);

  const { error } = await sb.rpc("delete_league", { p_league_id: leagueId });
  if (error) redirect(`/?err=${enc(error.message)}`);

  redirect(`/?ok=${enc("League deleted.")}`);
}

export async function joinLeagueAction(formData: FormData) {
  const code = String(formData.get("inviteCode") || "").trim();
  if (!code) redirect(`/league/join?err=${enc("Invite code is required.")}`);

  const sb = supabaseServer();
  const { data, error } = await sb.rpc("join_league_by_code", { p_invite_code: code });
  if (error) redirect(`/league/join?err=${enc(error.message)}`);

  redirect(`/league/${String(data)}`);
}

export async function advanceWeekAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const sb = supabaseServer();
  const { error } = await sb.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}?ok=${enc("Week advanced.")}`);
}

export async function selectRoleAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const role = String(formData.get("role") || "Head Coach").trim();

  const sb = supabaseServer();
  const { error } = await sb.rpc("set_membership_team_role", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_role: role
  });

  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/settings?ok=${enc("Role saved.")}`);
}
