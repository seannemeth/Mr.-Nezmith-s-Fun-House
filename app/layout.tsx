import "./globals.css";
import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";
import { signOutAction } from "./actions";

export const metadata = {
  title: "CFB Text Dynasty",
  description: "Text-based college football dynasty (multiplayer)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;

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
          </div>
        </div>

        <div className="container">{children}</div>
      </body>
    </html>
  );
}
