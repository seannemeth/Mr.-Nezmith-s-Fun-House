// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Read-only server client for Server Components.
 * DO NOT mutate cookies here (Next will throw during render).
 */
export function supabaseServer() {
  const cookieStore = cookies();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // no-ops to avoid cookie mutation during Server Component render
      set() {},
      remove() {},
    },
  });
}

export const createSupabaseServerClient = supabaseServer;
