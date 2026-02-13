// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Vercel Edge middleware must be FAST.
 * Do NOT do DB queries here. Only refresh session cookies and (optionally) protect obvious routes.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh auth session (fast). Do NOT call DB tables/RPC here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optional: protect "league" routes at a high level.
  // Keep this very simple. No membership checks here.
  const path = req.nextUrl.pathname;
  const isLeagueRoute = path.startsWith("/league");

  if (isLeagueRoute && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return res;
}

// Do not run middleware on static assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
