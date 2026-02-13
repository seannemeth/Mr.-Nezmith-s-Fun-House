// app/actions.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s ?? "");
}

/** Build a league-scoped path */
function leaguePath(leagueId: string, path: string) {
  return `/league/${leagueId}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Create Supabase server client, but never throw to the browser (redirect with an error instead). */
function safeSupabase(orRedirectTo: string) {
  try {
    return supabaseServer();
  } catch (e: any) {
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
    // This catches network-layer failures that surface as "fetch failed"
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

    // Depending on your Supabase auth settings, the user may need email confirmation.
    redirect(`/login?ok=${enc("Account created. If required, confirm your email, then sign in.")}`);
  } catch (e: any) {
    const msg = e?.message || "fetch failed";
    redirect(`/login?err=${enc(`Sign-up failed: ${msg}`)}`);
  }
}

export async function signOutAction() {
  const supabase = safeSupabase("/login");

  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  redirect(`/login?ok=${enc("Signed out.")}`);
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

  if (error) redirect(leaguePath(leagueId, `/?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/?msg=${enc("Advanced week.")}`));
}

/* =====================================================================================
 * TEAMS
 * ===================================================================================== */

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

/* =====================================================================================
 * RECRUITING ACTIONS
 * ===================================================================================== */

export async function offerScholarshipAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("add_recruiting_offer", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
  });

  if (error) redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Scholarship offered.")}`));
}

export async function withdrawScholarshipAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("withdraw_recruiting_offer", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
  });

  if (error) redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/recruiting?msg=${enc("Scholarship withdrawn.")}`));
}

export async function scheduleRecruitVisitAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const weekRaw = String(formData.get("week") || "").trim();
  const visitType = String(formData.get("visitType") || "official").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing team.")}`));
  if (!recruitId) redirect(leaguePath(leagueId, `/recruiting?err=${enc("Missing recruit.")}`));

  const week = Number(weekRaw);
  if (!Number.isFinite(week) || week < 1 || week > 20) {
    redirect(leaguePath(leagueId, `/recruiting?err=${enc("Invalid visit week.")}`));
  }

  const supabase = safeSupabase("/");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_recruit_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_week: week,
    p_visit_type: visitType,
  });

  if (error) redirect(leaguePath(leagueId, `/recruiting?err=${enc(error.message)}`));
  redirect(leaguePath(leagueId, `/recruiting?msg=${enc(`Visit scheduled (Week ${week}).`)}`));
}
