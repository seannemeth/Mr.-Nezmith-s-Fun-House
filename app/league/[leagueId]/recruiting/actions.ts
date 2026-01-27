// app/league/[leagueId]/recruiting/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

type AdvanceWeekResult =
  | { ok: true; message: string; summary: any }
  | { ok: false; message: string };

export async function advanceRecruitingWeek(
  leagueId: string
): Promise<AdvanceWeekResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return { ok: false, message: userErr.message };
  if (!user) return { ok: false, message: "Not signed in." };

  // Belt-and-suspenders commissioner check (RPC should also enforce commissioner_only)
  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id, commissioner_id, current_season, current_week")
    .eq("id", leagueId)
    .single();

  if (leagueErr) return { ok: false, message: leagueErr.message };
  if (!league) return { ok: false, message: "League not found." };

  if (league.commissioner_id !== user.id) {
    return { ok: false, message: "Only the commissioner can advance the week." };
  }

  const { data: summary, error: rpcErr } = await supabase.rpc(
    "process_recruiting_week_v1",
    { p_league_id: leagueId }
  );

  if (rpcErr) return { ok: false, message: rpcErr.message };

  // Refresh recruiting UI
  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}`);

  return { ok: true, message: "Week advanced successfully.", summary };
}
