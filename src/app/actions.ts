"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabaseServer";

export async function signUp(email: string, password: string) {
  const supabase = supabaseServer();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  redirect("/");
}

export async function signIn(email: string, password: string) {
  const supabase = supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  redirect("/");
}

export async function signOut() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createLeague(name: string, teamNames: string[]) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data, error } = await supabase.rpc("create_league_with_teams", {
    p_name: name,
    p_team_names: teamNames
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function joinLeague(inviteCode: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("join_league_by_code", {
    p_invite_code: inviteCode
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/league/${data}`);
}

export async function advanceWeek(leagueId: string) {
  const supabase = supabaseServer();
  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) throw new Error(error.message);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/standings`);
  revalidatePath(`/league/${leagueId}/schedule`);
}
