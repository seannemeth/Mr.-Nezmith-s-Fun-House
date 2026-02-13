// app/api/_debug/supabase-selftest/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // If these are missing, your Server Components will crash in prod.
    if (!hasUrl || !hasAnon) {
      return NextResponse.json(
        {
          ok: false,
          step: "env",
          hasSupabaseUrl: hasUrl,
          hasSupabaseAnonKey: hasAnon,
          supabaseUrlHost: hasUrl ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host : null,
        },
        { status: 500 }
      );
    }

    const sb = supabaseServer();

    // 1) Basic auth read (should NOT require cookie writes)
    const s1 = await sb.auth.getSession();
    const s2 = await sb.auth.getUser();

    // 2) Tiny DB ping (doesn't require schema knowledge)
    // If this fails, your Supabase URL/key/env/project is wrong.
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
