// app/actions.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s ?? "");
}

function rethrowRedirect(e: any) {
  // Next.js redirect() throws an internal error with digest containing NEXT_REDIRECT.
  // We must rethrow it so the framework can perform the redirect.
  const digest = String(e?.digest ?? e?.message ?? "");
  if (digest.includes("NEXT_REDIRECT")) throw e;
}

function safeSupabase(orRedirectTo: string) {
  try {
    return supabaseServer();
  } catch (e: any) {
    rethrowRedirect(e);
    const msg =
      e?.message ??
      "Server misconfigured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).";
    redirect(`${orRedirectTo}?err=${enc(msg)}`);
  }
}

/* =====================================================================================
 * AUTH ACTIONS
 * ===================================================================================== */

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    redirect(`/login?err=${enc("Email and password are required.")}`);
  }

  const supabase = safeSupabase("/login");

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?err=${enc(error.message)}`);
    redirect(`/`);
  } catch (e: any) {
    rethrowRedirect(e);
    const msg = e?.message || "fetch failed";
    redirect(`/login?err=${enc(`Sign-in failed: ${msg}`)}`);
  }
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    redirect(`/login?err=${enc("Email and password are required.")}`);
  }

  const supabase = safeSupabase("/login");

  try {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) redirect(`/login?err=${enc(error.message)}`);
    redirect(`/login?ok=${enc("Account created. If required, confirm your email, then sign in.")}`);
  } catch (e: any) {
    rethrowRedirect(e);
    const msg = e?.message || "fetch failed";
    redirect(`/login?err=${enc(`Sign-up failed: ${msg}`)}`);
  }
}

export async function signOutAction() {
  const supabase = safeSupabase("/login");

  try {
    await supabase.auth.signOut();
    redirect(`/login?ok=${enc("Signed out.")}`);
  } catch (e: any) {
    rethrowRedirect(e);
    redirect(`/login?err=${enc("Sign-out failed.")}`);
  }
}

/* =====================================================================================
 * LEAGUE ACTIONS
 * ===================================================================================== */

export async function joinLeagueAction(formData: FormData) {
  const leagueCode = String(formData.get("code") || "").trim();

  const supabase = safeSupabase("/league/join");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  if (!leagueCode) redirect(`/league/join?err=${enc("League code is required.")}`);

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id")
    .eq("code", leagueCode)
    .single();

  if (leagueErr || !league) redirect(`/league/join?err=${enc("League not found.")}`);

  const { error: insertErr } = await supabase
    .from("memberships")
    .upsert(
      { league_id: league.id, user_id: userData.user.id, role: "member" },
      { onConflict: "league_id,user_id" }
    );

  if (insertErr) redirect(`/league/join?err=${enc(insertErr.message)}`);

  redirect(`/league/${league.id}?msg=${enc("Joined league.")}`);
}

export async function deleteLeagueAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
  if (error) redirect(`/?err=${enc(error.message)}`);

  redirect(`/?msg=${enc("League deleted.")}`);
}

/* =====================================================================================
 * SIM / ADVANCE WEEK
 * ===================================================================================== */

export async function advanceWeekAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}?msg=${enc("Advanced week.")}`);
}

/* =====================================================================================
 * TEAMS
 * ===================================================================================== */

export async function updateTeamAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}?err=${enc("Missing team id.")}`);

  const name = String(formData.get("name") || "").trim();
  const prestigeRaw = String(formData.get("prestige") || "").trim();

  const prestige = prestigeRaw ? Number(prestigeRaw) : undefined;
  if (prestigeRaw && (!Number.isFinite(prestige) || prestige! < 1 || prestige! > 6)) {
    redirect(`/league/${leagueId}/teams/${teamId}?err=${enc("Prestige must be 1-6.")}`);
  }

  const patch: any = {};
  if (name) patch.name = name;
  if (prestige !== undefined) patch.prestige = prestige;

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.from("teams").update(patch).eq("id", teamId);
  if (error) redirect(`/league/${leagueId}/teams/${teamId}?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/teams/${teamId}?msg=${enc("Team updated.")}`);
}
