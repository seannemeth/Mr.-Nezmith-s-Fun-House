import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (user && leagueId) {
    const res = await supabase
      .from("memberships")
      .select("league_id, team_id, role, user_id")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();

    membership = res.data;
    membershipError = res.error;
  }

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    userError: userError?.message ?? null,
    leagueId,
    membership,
    membershipError: membershipError?.message ?? null,
  });
}
