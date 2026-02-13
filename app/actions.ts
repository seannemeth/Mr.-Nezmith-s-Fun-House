// app/actions.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAction } from "../lib/supabaseAction";

function enc(s: string) {
  return encodeURIComponent(s ?? "");
}

// Next.js redirect() throws an internal error. If we catch it, we must rethrow it.
function rethrowIfNextRedirect(e: any) {
  const digest = String(e?.digest ?? "");
  const msg = String(e?.message ?? "");
  if (digest.includes("NEXT_REDIRECT") || msg.includes("NEXT_REDIRECT")) throw e;
}

function safeSupabase(orRedirectTo: string) {
  try {
    return supabaseAction();
  } catch (e: any) {
    rethrowIfNextRedirect(e);
    redirect(`${orRedirectTo}?err=${enc(e?.message ?? "Server misconfigured.")}`);
  }
}

/** Build a league-scoped path */
function leaguePath(leagueId: string, path: string) {
  return `/league/${leagueId}${path.startsWith("/") ? path : `/${path}`}`;
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) redirect(`/login?err=${enc(error.message)}`);
    if (!data?.session) redirect(`/login?err=${enc("Sign-in failed: no session returned.")}`);

    redirect(`/`);
  } catch (e: any) {
    rethrowIfNextRedirect(e);
    redirect(`/login?err=${enc(`Sign-in failed: ${e?.message ?? "fetch failed"}`)}`);
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
    rethrowIfNextRedirect(e);
    redirect(`/login?err=${enc(`Sign-up failed: ${e?.message ?? "fetch failed"}`)}`);
  }
}

export async function signOutAction() {
  const supabase = safeSupabase("/login");

  try {
    await supabase.auth.signOut();
    redirect(`/login?ok=${enc("Signed out.")}`);
  } catch (e: any) {
    rethrowIfNextRedirect(e);
    redirect(`/login?err=${enc(`Sign-out failed: ${e?.message ?? "fetch failed"}`)}`);
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

  redirect(leaguePath(league.id, `/?msg=${enc("Joined league.")}`));
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

export async function advanceWeekAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/?err=${enc("Missing league id.")}`);

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });

  if (error) redirect(leaguePath(leagueId, `/?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/?msg=${enc("Advanced week.")}`));
}

export async function updateTeamAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(leaguePath(leagueId, `/?err=${enc("Missing team id.")}`));

  const name = String(formData.get("name") || "").trim();
  const prestigeRaw = String(formData.get("prestige") || "").trim();

  const prestige = prestigeRaw ? Number(prestigeRaw) : undefined;
  if (prestigeRaw && (!Number.isFinite(prestige) || prestige! < 1 || prestige! > 6)) {
    redirect(leaguePath(leagueId, `/teams/${teamId}?err=${enc("Prestige must be 1-6.")}`));
  }

  const patch: any = {};
  if (name) patch.name = name;
  if (prestige !== undefined) patch.prestige = prestige;

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.from("teams").update(patch).eq("id", teamId);

  if (error) redirect(leaguePath(leagueId, `/teams/${teamId}?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/teams/${teamId}?msg=${enc("Team updated.")}`));
}

