// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Minimal env validation to avoid silent misconfig in prod.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Primary server client factory used across Server Components and Server Actions.
 * This is what your code is importing: `import { supabaseServer } from "../lib/supabaseServer"`.
 */
export function supabaseServer() {
  const cookieStore = cookies();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  // For SSR server client, we typically use the anon key (public) plus cookies for auth.
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // next/headers cookies() is mutable in Route Handlers and Server Actions.
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Optional alias to match earlier guidance / future refactors.
 * (Does not break existing imports.)
 */
export const createSupabaseServerClient = supabaseServer;
