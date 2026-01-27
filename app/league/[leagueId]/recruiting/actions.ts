"use server";

// app/league/[leagueId]/recruiting/actions.ts
import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabaseServer";

type TryOk = { ok: true };
type TryFail = { ok: false; message: string };
export type TryResult = TryOk | TryFail;

function fail(message: string): TryFail {
  return { ok: false, message };
}

async function requireAuthAndTeam(leagueId: string) {
  const supabase = supabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { supabase: null as any, userId: null as any, teamId: null as any, error: userErr.message };
  const userId = userData?.user?.id;
  if (!userId) return { supabase: null as any, userId: null as any, teamId: null as any, error: "Not signed in" };

  const { data: membership, error: membershipErr } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipErr) return { supabase: null as any, userId: null as any, teamId: null as any, error: membershipErr.message };

  const teamId = membership?.team_id ?? null;
  if (!teamId) return { supabase: null as any, userId, teamId: null as any, error: "No team selected for this league" };

  return { supabase, userId, teamId, error: null as any };
}

/**
 * Insert/upsert an offer row for (league_id, team_id, recruit_id).
 * This tries a few column names so it survives schema drift.
 */
async function upsertOffer(params: {
  leagueId: string;
  teamId: string;
  recruitId: string;
  offerType?: string | null;
}) {
  const { leagueId, teamId, recruitId, offerType } = params;
  const supabase = supabaseServer();

  // Try likely column layouts.
  const payloads: Record<string, any>[] = [
    // common
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, offer_type: offerType ?? "scholarship" },
    // alt naming
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, type: offerType ?? "scholarship" },
    // some schemas use committed/target ids etc (less likely)
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId },
  ];

  let lastErr: string | null = null;

  for (const payload of payloads) {
    // Use upsert if possible (requires a unique constraint, but harmless if it exists)
    const { error } = await supabase.from("recruiting_offers").upsert(payload as any);
    if (!error) return { ok: true as const };

    lastErr = error.message;

    // If upsert fails because no unique constraint, fall back to insert
    const { error: insErr } = await supabase.from("recruiting_offers").insert(payload as any);
    if (!insErr) return { ok: true as const };
    lastErr = insErr.message;
  }

  return { ok: false as const, message: lastErr ?? "Unknown offer insert error" };
}

async function deleteOffer(params: { leagueId: string; teamId: string; recruitId: string }) {
  const { leagueId, teamId, recruitId } = params;
  const supabase = supabaseServer();

  // delete is schema stable if these columns exist; if not, you'll get a clear error
  const { error } = await supabase
    .from("recruiting_offers")
    .delete()
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .eq("recruit_id", recruitId);

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

async function upsertVisit(params: { leagueId: string; teamId: string; recruitId: string; week: number }) {
  const { leagueId, teamId, recruitId, week } = params;
  const supabase = supabaseServer();

  const payloads: Record<string, any>[] = [
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, week },
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, visit_week: week },
    { league_id: leagueId, team_id: teamId, recruit_id: recruitId, week_num: week },
  ];

  let lastErr: string | null = null;

  for (const payload of payloads) {
    const { error } = await supabase.from("recruit_visits").upsert(payload as any);
    if (!error) return { ok: true as const };

    lastErr = error.message;

    const { error: insErr } = await supabase.from("recruit_visits").insert(payload as any);
    if (!insErr) return { ok: true as const };
    lastErr = insErr.message;
  }

  return { ok: false as const, message: lastErr ?? "Unknown visit insert error" };
}

/**
 * Server Action: Make/Upsert offer
 */
export async function makeOfferAction(formData: FormData): Promise<TryResult> {
  const leagueId = String(formData.get("leagueId") ?? "");
  const recruitId = String(formData.get("recruitId") ?? "");
  const offerType = (formData.get("offerType") ? String(formData.get("offerType")) : "scholarship") as string;

  if (!leagueId) return fail("Missing leagueId");
  if (!recruitId) return fail("Missing recruitId");

  const { supabase, teamId, error } = await requireAuthAndTeam(leagueId);
  if (error) return fail(error);

  // use derived teamId from membership
  const res = await upsertOffer({ leagueId, teamId, recruitId, offerType });
  if (!res.ok) return fail(res.message);

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true };
}

/**
 * Server Action: Remove offer
 */
export async function removeOfferAction(formData: FormData): Promise<TryResult> {
  const leagueId = String(formData.get("leagueId") ?? "");
  const recruitId = String(formData.get("recruitId") ?? "");

  if (!leagueId) return fail("Missing leagueId");
  if (!recruitId) return fail("Missing recruitId");

  const { teamId, error } = await requireAuthAndTeam(leagueId);
  if (error) return fail(error);

  const res = await deleteOffer({ leagueId, teamId, recruitId });
  if (!res.ok) return fail(res.message);

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true };
}

/**
 * Server Action: Schedule visit (week)
 */
export async function scheduleVisitAction(formData: FormData): Promise<TryResult> {
  const leagueId = String(formData.get("leagueId") ?? "");
  const recruitId = String(formData.get("recruitId") ?? "");
  const week = Number(formData.get("week") ?? "");

  if (!leagueId) return fail("Missing leagueId");
  if (!recruitId) return fail("Missing recruitId");
  if (!Number.isFinite(week) || week <= 0) return fail("Invalid week");

  const { teamId, error } = await requireAuthAndTeam(leagueId);
  if (error) return fail(error);

  const res = await upsertVisit({ leagueId, teamId, recruitId, week });
  if (!res.ok) return fail(res.message);

  revalidatePath(`/league/${leagueId}/recruiting`);
  return { ok: true };
}
