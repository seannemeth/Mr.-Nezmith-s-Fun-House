"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Advances recruiting by exactly one week for a league.
 * This calls the Postgres RPC:
 *   public.process_recruiting_week_v1(p_league_id uuid) -> jsonb
 *
 * The RPC is commissioner/admin guarded in SQL.
 */
export async function advanceRecruitingWeekAction(leagueId: string) {
  if (!leagueId) {
    throw new Error("Missing leagueId");
  }

  const supabase = createClient();

  // Call the server-authoritative weekly recruiting processor
  const { data, error } = await supabase.rpc("process_recruiting_week_v1", {
    p_league_id: leagueId,
  });

  if (error) {
    // surface the real Postgres error message
    throw new Error(error.message);
  }

  // Make sure the recruiting page re-renders with:
  // - updated current_week
  // - updated interests
  // - applied visits / commitments
  revalidatePath(`/league/${leagueId}/recruiting`);

  return data;
}
