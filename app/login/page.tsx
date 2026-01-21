
import Link from "next/link";
import { supabaseServer } from "../../lib/supabaseServer";
import { signInAction, signOutAction, signUpAction } from "../actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { msg?: string; err?: string };
}) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Account</div>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {user ? (
          <>
            <p className="muted">Signed in as <b>{user.email}</b></p>
            <form action={signOutAction}>
              <button className="btn secondary" type="submit">Sign out</button>
            </form>
            <div style={{ height: 12 }} />
            <Link className="btn" href="/">Go to Home</Link>
          </>
        ) : (
          <p className="muted">Create an account or sign in.</p>
        )}
      </div>

      {!user ? (
        <>
          <div className="card col6">
            <div className="h2">Sign in</div>
            <form action={signInAction}>
              <label className="muted">Email</label>
              <input className="input" name="email" type="email" placeholder="you@example.com" />
              <div style={{ height: 10 }} />
              <label className="muted">Password</label>
              <input className="input" name="password" type="password" />
              <div style={{ height: 12 }} />
              <button className="btn" type="submit">Sign in</button>
            </form>
          </div>

          <div className="card col6">
            <div className="h2">Sign up</div>
            <form action={signUpAction}>
              <label className="muted">Email</label>
              <input className="input" name="email" type="email" placeholder="you@example.com" />
              <div style={{ height: 10 }} />
              <label className="muted">Password</label>
              <input className="input" name="password" type="password" />
              <div style={{ height: 12 }} />
              <button className="btn secondary" type="submit">Create account</button>
            </form>
            <p className="muted" style={{ marginTop: 10 }}>
              If you get “Email not confirmed”, disable email confirmation in Supabase Auth settings for now.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
