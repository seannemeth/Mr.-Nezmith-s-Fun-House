"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

/**
 * Advances recruiting by exactly one week for a league.
 * Calls Postgres RPC:
 *   public.process_recruiting_week_v1(p_league_id uuid) -> jsonb
 *
 * Notes:
 * - RPC is commissioner/admin guarded in SQL
 * - We also verify user is signed in for cleaner errors
 */
export async function advanceRecruitingWeekAction(leagueId: string) {
  const id = String(leagueId || "").trim();
  if (!id) throw new Error("Missing leagueId");

  const supabase = supabaseServer();

  // Ensure user is signed in (nice error vs silent RLS/RPC failure)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData?.user) throw new Error("Please sign in first.");

  const { data, error } = await supabase.rpc("process_recruiting_week_v1", {
    p_league_id: id,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate the recruiting page so server components re-fetch updated state
  revalidatePath(`/league/${id}/recruiting`);

  return data; // jsonb summary from the RPC
}
