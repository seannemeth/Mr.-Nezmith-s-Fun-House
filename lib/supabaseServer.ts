import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component-safe Supabase client.
 * IMPORTANT: In Server Components, Next.js does not allow mutating cookies.
 * So we provide a cookie interface that can READ, and we safely NO-OP writes.
 * Cookie writes happen in middleware.ts (which is allowed to set cookies).
 */
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // NO-OP in Server Components (cookie mutation not allowed here)
        },
        remove() {
          // NO-OP in Server Components (cookie mutation not allowed here)
        }
      }
    }
  );
}
