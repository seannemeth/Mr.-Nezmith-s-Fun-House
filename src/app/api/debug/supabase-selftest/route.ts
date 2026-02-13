// src/app/api/debug/supabase-selftest/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!hasUrl || !hasAnon) {
      return NextResponse.json(
        {
          ok: false,
          step: "env",
          hasSupabaseUrl: hasUrl,
          hasSupabaseAnonKey: hasAnon,
          supabaseUrlHost: hasUrl
            ? (() => {
                try {
                  return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
                } catch {
                  return "invalid-url";
                }
              })()
            : null,
        },
        { status: 500 }
      );
    }

    const sb = supabaseServer();

    const s1 = await sb.auth.getSession();
    const s2 = await sb.auth.getUser();

    const ping = await sb.from("leagues").select("id").limit(1);

    return NextResponse.json({
      ok: true,
      auth: {
        sessionHasUser: Boolean(s1.data?.session?.user),
        userId: s2.data?.user?.id ?? null,
        getSessionError: s1.error?.message ?? null,
        getUserError: s2.error?.message ?? null,
      },
      db: {
        pingError: ping.error?.message ?? null,
        pingCount: Array.isArray(ping.data) ? ping.data.length : null,
      },
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
