// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component safe Supabase client:
 * - can READ cookies
 * - must NOT write cookies (Next will throw if you try)
 *
 * IMPORTANT: Many pages import { supabaseServer } from this file.
 * Do not rename this export.
 */
export function supabaseServer() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on server.");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // NO-OP in Server Components (writes are not allowed here)
      set() {},
      remove() {},
    },
  });
}
