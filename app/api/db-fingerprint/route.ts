// app/api/db-fingerprint/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get("leagueId");

    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const supabaseUrlHost = hasUrl
      ? (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
          } catch {
            return "invalid-url";
          }
        })()
      : null;

    const supabase = supabaseServer();

    // Auth diagnostics
    const sessionRes = await supabase.auth.getSession();
    const userRes = await supabase.auth.getUser();

    const userId = userRes.data?.user?.id ?? null;

    // DB ping (lightweight)
    const ping = await supabase.from("leagues").select("id").limit(1);

    // membership rows visible (RLS applies)
    const memberships =
      userId && leagueId
        ? await supabase
            .from("memberships")
            .select("league_id, team_id, role")
            .eq("league_id", leagueId)
        : ({ data: null, error: null } as any);

    // recruits visible (RLS applies)
    const recruits =
      leagueId
        ? await supabase
            .from("recruits")
            .select("id", { count: "exact", head: true })
            .eq("league_id", leagueId)
        : ({ data: null, error: null, count: null } as any);

    // RPC probe (if function exists)
    const rpc =
      leagueId
        ? await supabase.rpc("get_recruit_list_v1", {
            p_league_id: leagueId,
            p_limit: 5,
            p_offset: 0,
            p_only_uncommitted: true,
            p_team_id: null,
          })
        : ({ data: null, error: null } as any);

    return NextResponse.json({
      ok: true,
      env: {
        hasSupabaseUrl: hasUrl,
        hasSupabaseAnonKey: hasAnon,
        supabaseUrlHost,
      },
      auth: {
        sessionHasUser: Boolean(sessionRes.data?.session?.user),
        sessionError: sessionRes.error?.message ?? null,
        userId,
        userError: userRes.error?.message ?? null,
      },
      db: {
        pingError: ping.error?.message ?? null,
        pingCount: Array.isArray(ping.data) ? ping.data.length : null,
      },
      leagueId,
      membershipsError: memberships.error?.message ?? null,
      memberships: memberships.data ?? null,
      recruitsCountVisible: (recruits as any).count ?? null,
      recruitsError: recruits.error?.message ?? null,
      rpcError: rpc.error?.message ?? null,
      rpcSampleCount: Array.isArray(rpc.data) ? rpc.data.length : null,
      rpcSample: rpc.data ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        step: "exception",
        message: e?.message ?? String(e),
        name: e?.name ?? null,
        stack: e?.stack ?? null,
      },
      { status: 500 }
    );
  }
}
