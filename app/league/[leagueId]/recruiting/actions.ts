export async function advanceRecruitingWeek(leagueId: string): Promise<ActionResult> {
  if (!leagueId) return { ok: false, message: "Missing leagueId." };

  // 1) Use cookie-bound client to authenticate the caller
  const supabase = supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return { ok: false, message: userErr.message };
  if (!user) return { ok: false, message: "Not authenticated" };

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

  // 2) Run the weekly processor using a service-role client (bypasses RLS/JWT issues)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!service) {
    return {
      ok: false,
      message:
        "Missing SUPABASE_SERVICE_ROLE_KEY env var. Add it in Vercel + locally.",
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: summary, error: rpcErr } = await admin.rpc(
    "process_recruiting_week_v1",
    { p_league_id: leagueId }
  );

  if (rpcErr) return { ok: false, message: rpcErr.message };

  revalidatePath(`/league/${leagueId}/recruiting`);
  revalidatePath(`/league/${leagueId}`);

  return { ok: true, message: "Week advanced successfully.", data: summary };
}
