// src/app/api/db-fingerprint/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

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

    const supabase = createSupabaseServerClient();

    const sessionRes = await supabase.auth.getSession();
    const userRes = await supabase.auth.getUser();

    const user = userRes.data?.user ?? null;

    const ping = await supabase.from("leagues").select("id").limit(1);

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

    const recruits =
      leagueId
        ? await supabase
            .from("recruits")
            .select("id", { count: "exact", head: true })
            .eq("league_id", leagueId)
        : ({ data: null, error: null, count: null } as any);

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
        user: user ? { id: user.id, email: user.email } : null,
        userError: userRes.error?.message ?? null,
      },
      db: {
        pingError: ping.error?.message ?? null,
        pingCount: Array.isArray(ping.data) ? ping.data.length : null,
      },
      leagueId,
      membership,
      membershipError: membershipError?.message ?? null,
      recruitsCountVisible: (recruits as any).count ?? null,
      recruitsError: recruits.error?.message ?? null,
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
