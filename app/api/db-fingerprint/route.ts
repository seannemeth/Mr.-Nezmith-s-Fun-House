import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const leagueId = url.searchParams.get("leagueId");

  let membership: any = null;
  let membershipError: any = null;

  let recruitsCount: number | null = null;
  let recruitsError: any = null;

  if (user && leagueId) {
    // membership (what your guards likely depend on)
    const mem = await supabase
      .from("memberships")
      .select("league_id, team_id, role, user_id")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();

    membership = mem.data;
    membershipError = mem.error;

    // recruits count (proves DB + RLS in the deployed environment)
    const rec = await supabase
      .from("recruits")
      .select("id", { count: "exact", head: true })
      .eq("league_id", leagueId);

    recruitsCount = rec.count ?? null;
    recruitsError = rec.error;
  }

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    userError: userError?.message ?? null,
    leagueId,
    membership,
    membershipError: membershipError?.message ?? null,
    recruitsCount,
    recruitsError: recruitsError?.message ?? null,
  });
}
