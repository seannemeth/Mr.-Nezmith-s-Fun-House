import "../styles/globals.css";
import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <html lang="en">
      <body>
        <div className="nav">
          <div className="row">
            <Link className="brand" href="/">CFB Text Dynasty</Link>
            {user ? (
              <>
                <Link href="/league/new">New League</Link>
                <Link href="/league/join">Join</Link>
              </>
            ) : null}
          </div>
          <div className="row">
            {user ? (
              <Link className="btn secondary" href="/login">Account</Link>
            ) : (
              <Link className="btn" href="/login">Sign in</Link>
            )}
          </div>
        </div>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
