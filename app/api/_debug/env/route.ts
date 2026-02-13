// app/api/_debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return NextResponse.json({
    ok: true,
    hasSupabaseUrl: Boolean(url),
    hasSupabaseAnonKey: Boolean(anon),
    supabaseUrlHost: url ? (() => { try { return new URL(url).host; } catch { return "invalid-url"; } })() : null,
    anonKeyPreview: anon ? `${anon.slice(0, 6)}…${anon.slice(-4)}` : null,
  });
}
