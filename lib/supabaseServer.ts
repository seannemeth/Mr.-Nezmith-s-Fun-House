// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseServer() {
  const cookieStore = cookies();

  // NOTE:
  // In Server Components, cookie mutation can throw.
  // We ignore setAll errors so reads still work safely.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't always set cookies (that's okay here).
          }
        },
      },
    }
  );
}
