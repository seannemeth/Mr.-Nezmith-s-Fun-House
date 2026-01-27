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

export async function makeOfferAction(input: OfferInput): Promise<TryResult> {
  try {
    const { leagueId, teamId, recruitId } = input;

    const supabase = supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return { ok: false, message: authErr.message };
    if (!auth?.user) return { ok: false, message: "Not authenticated." };

    // Minimal insert. If your table requires more columns, tell me and I’ll adjust.
    const { error } = await supabase.from("recruiting_offers").insert({
      league_id: leagueId,
      team_id: teamId,
      recruit_id: recruitId,
    });

    if (error) {
      // 23505 = unique violation (already offered). Treat as OK for idempotency.
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
