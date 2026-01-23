"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

export async function addToBoardAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const slot = Number(String(formData.get("slot") || "").trim());

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Team & Role).")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit.")}`);
  if (!slot || slot < 1 || slot > 8) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a slot 1-8.")}`);

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("add_to_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_slot: slot
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/recruiting?msg=${enc("Added to Top-8.")}`);
}

export async function removeFromBoardAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Team & Role).")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit.")}`);

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_from_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/recruiting?msg=${enc("Removed.")}`);
}

export async function setPipelineAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const bonus = Number(String(formData.get("bonus") || "5").trim() || "5");

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Team & Role).")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("State is required.")}`);

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_pipeline_state", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_state: state,
    p_bonus: bonus
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/recruiting?msg=${enc("Pipeline saved.")}`);
}

export async function removePipelineAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Team & Role).")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("State is required.")}`);

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_pipeline_state", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_state: state
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/recruiting?msg=${enc("Pipeline removed.")}`);
}

export async function scheduleVisitAction(formData: FormData) {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const week = Number(String(formData.get("week") || "").trim());
  const visitType = String(formData.get("visitType") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Team & Role).")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit.")}`);
  if (!week) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a week.")}`);
  if (!visitType) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a visit type.")}`);

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("schedule_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_week: week,
    p_visit_type: visitType
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/recruiting?msg=${enc("Visit scheduled.")}`);
}
