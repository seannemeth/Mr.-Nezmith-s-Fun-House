"use server";

// app/league/[leagueId]/recruiting/actions.ts
import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

export type TryResult = { ok: true } | { ok: false; message: string };

type OfferInput = {
  leagueId: string;
  teamId: string;
  recruitId: string;
};

function errMsg(e: unknown) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as any).message);
  return "Unknown error";
}

async function getLeagueSeasonWeek(supabase: ReturnType<typeof supabaseServer>, leagueId: string) {
  const { data, error } = await supabase
    .from("leagues")
    .select("current_season, current_week")
    .eq("id", leagueId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("League not found.");
  return {
    season: data.current_season ?? 1,
    week: data.current_week ?? 1,
  };
}

export async function makeOfferAction(input: OfferInput): Promise<TryResult> {
  try {
    const { leagueId, teamId, recruitId } = input;

    const supabase = supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return { ok: false, message: authErr.message };
    if (!auth?.user) return { ok: false, message: "Not authenticated." };

    // ✅ Fetch season/week so NOT NULL constraints are satisfied
    const { season, week } = await getLeagueSeasonWeek(supabase, leagueId);

    // Build insert payload. Your table requires season NOT NULL.
    // If your table also has week NOT NULL, we try to set it too.
    const payload: Record<string, any> = {
      league_id: leagueId,
      team_id: teamId,
      recruit_id: recruitId,
      season, // REQUIRED by your constraint
    };

    // If your recruiting_offers table has a "week" column, include it.
    // If it doesn't exist, Supabase will throw 42703; we handle that gracefully by retrying without week.
    payload.week = week;

    let { error } = await supabase.from("recruiting_offers").insert(payload);

    // If "week" column doesn't exist, retry without it
    if (error && (error as any).code === "42703") {
      delete payload.week;
      const retry = await supabase.from("recruiting_offers").insert(payload);
      error = retry.error ?? null;
    }

    if (error) {
      // 23505 = unique violation (already offered). Treat as OK.
      if ((error as any).code === "23505") {
        revalidatePath(`/league/${leagueId}/recruiting`);
        return { ok: true };
      }
      return { ok: false, message: error.message };
    }

    revalidatePath(`/league/${leagueId}/recruiting`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

export async function removeOfferAction(input: OfferInput): Promise<TryResult> {
  try {
    const { leagueId, teamId, recruitId } = input;

    const supabase = supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return { ok: false, message: authErr.message };
    if (!auth?.user) return { ok: false, message: "Not authenticated." };

    const { error } = await supabase
      .from("recruiting_offers")
      .delete()
      .eq("league_id", leagueId)
      .eq("team_id", teamId)
      .eq("recruit_id", recruitId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/league/${leagueId}/recruiting`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}
