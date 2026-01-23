import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

const VISIT_TYPES = [
  { id: "unofficial", label: "Unofficial" },
  { id: "official", label: "Official" },
  { id: "game", label: "Game Day" }
] as const;

async function addToBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const slot = Number(String(formData.get("slot") || "0"));

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Settings → Team & Role).")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);
  if (!slot || slot < 1 || slot > 8) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a slot 1–8.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("add_to_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_slot: slot
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Added to Top-8 board.")}`);
}

async function removeFromBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_from_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Removed from board.")}`);
}

async function scheduleVisitAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const week = Number(String(formData.get("week") || "0"));
  const visitType = String(formData.get("visitType") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);
  if (!week) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a week.")}`);
  if (!visitType) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a visit type.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

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

async function clearVisitAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("clear_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Visit cleared.")}`);
}

async function addPipelineAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("Enter a state code (e.g., MD).")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_pipeline_state", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_state: state,
    p_bonus: 5
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Pipeline saved.")}`);
}

async function removePipelineAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing state.")}`);

  const supabase = supaba
