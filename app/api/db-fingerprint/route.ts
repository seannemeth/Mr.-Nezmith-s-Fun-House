import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  // membership rows visible to this user (RLS applies)
  const memberships = userId && leagueId
    ? await supabase
        .from("memberships")
        .select("league_id, team_id, role")
        .eq("league_id", leagueId)
    : { data: null, error: null };

  // recruits visible to this user (RLS applies)
  const recruits = leagueId
    ? await supabase
        .from("recruits")
        .select("id", { count: "exact", head: true })
        .eq("league_id", leagueId)
    : { data: null, error: null, count: null as any };

  // also test the RPC your UI uses (if present)
  const rpc = leagueId
    ? await supabase.rpc("get_recruit_list_v1", {
        p_league_id: leagueId,
        p_limit: 5,
        p_offset: 0,
        p_only_uncommitted: true,
        p_team_id: null,
      })
    : { data: null, error: null };

  return NextResponse.json({
    ok: true,
    leagueId,
    userId,
    userErr: userErr?.message ?? null,
    membershipsError: (memberships as any).error?.message ?? null,
    memberships: (memberships as any).data ?? null,
    recruitsCountVisible: (recruits as any).count ?? null,
    recruitsError: (recruits as any).error?.message ?? null,
    rpcError: (rpc as any).error?.message ?? null,
    rpcSampleCount: Array.isArray((rpc as any).data) ? (rpc as any).data.length : null,
    rpcSample: (rpc as any).data ?? null,
  });
}
