// app/league/[leagueId]/recruiting/actions.ts
"use server";

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

    // Must be authed (RLS)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false, message: "Not authenticated." };

    // Minimal insert (schema-tolerant). Add more columns only if your table requires them.
    const { error } = await supabase.from("recruiting_offers").insert({
      league_id: leagueId,
      team_id: teamId,
      recruit_id: recruitId,
    });

    if (error) {
      // Duplicate offer (unique constraint) -> treat as ok
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

    const { data: auth } = await supabase.auth.getUser();
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
