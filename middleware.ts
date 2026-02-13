// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * HARD RULE: Edge middleware must be near-zero work.
 * No Supabase calls. No DB. No fetch. No auth refresh here.
 *
 * Do auth/membership gating inside server components (page.tsx) and route handlers instead.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
