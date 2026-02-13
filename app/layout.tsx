// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";
import { signOutAction } from "./actions";

export const metadata = {
  title: "CFB Text Dynasty",
  description: "Text-based college football dynasty (multiplayer)",
};

function EnvBanner() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasUrl && hasAnon) return null;

  return (
    <div
      style={{
        margin: "12px 0",
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,120,120,0.45)",
        background: "rgba(255,0,0,0.10)",
        color: "rgba(255,230,230,0.95)",
        fontWeight: 800,
      }}
    >
      Missing env vars on the server:
      <div style={{ marginTop: 6, fontWeight: 700 }}>
        NEXT_PUBLIC_SUPABASE_URL: {hasUrl ? "OK" : "MISSING"} <br />
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {hasAnon ? "OK" : "MISSING"}
      </div>
      <div style={{ marginTop: 8, fontWeight: 650, opacity: 0.9 }}>
        Fix in Vercel → Project Settings → Environment Variables (Production) → Redeploy.
      </div>
    </div>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // If env is missing, don't even try Supabase (avoids hidden digest crash)
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let user: any = null;
  let topbarError: string | null = null;

  if (hasUrl && hasAnon) {
    try {
      const sb = supabaseServer();
      const { data, error } = await sb.auth.getUser();
      if (error) topbarError = error.message;
      user = data?.user ?? null;
    } catch (e: any) {
      topbarError = e?.message ?? "Unknown server error in layout.";
      user = null;
    }
  }

  return (
    <html lang="en">
      <body>
        <div className="topbar">
          <div className="container">
            <div className="nav">
              <Link className="brand" href="/">CFB Text Dynasty</Link>

              {user && (
                <>
                  <Link href="/">Leagues</Link>
                  <Link href="/league/new">Create League</Link>
                  <Link href="/league/join">Join</Link>
                </>
              )}

              <div className="right">
                {user ? (
                  <form action={signOutAction}>
                    <button className="btn" type="submit">Sign out</button>
                  </form>
                ) : (
                  <Link className="btn primary" href="/login">Sign in</Link>
                )}
              </div>
            </div>

            <EnvBanner />

            {topbarError ? (
              <div
                style={{
                  margin: "12px 0",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,210,120,0.45)",
                  background: "rgba(255,210,120,0.10)",
                  color: "rgba(255,245,230,0.95)",
                  fontWeight: 800,
                }}
              >
                Supabase auth check failed in layout: {topbarError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="container">{children}</div>
      </body>
    </html>
  );
}
