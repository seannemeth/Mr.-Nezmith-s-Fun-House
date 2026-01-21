import Link from "next/link";
import { supabaseServer } from "../../lib/supabaseServer";
import { signInAction, signUpAction, signOutAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams?: { msg?: string; err?: string } }) {
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
        <p className="muted">{user ? `Signed in as ${user.email}` : "Sign in or create an account."}</p>
      </div>

      {!user ? (
        <>
          <div className="card col6">
            <div className="h2">Sign in</div>
            <form action={signInAction}>
              <label className="muted">Email</label>
              <input className="input" name="email" type="email" required />
              <div style={{ height: 10 }} />
              <label className="muted">Password</label>
              <input className="input" name="password" type="password" required />
              <div style={{ height: 12 }} />
              <button className="btn" type="submit">Sign in</button>
            </form>
          </div>

          <div className="card col6">
            <div className="h2">Create account</div>
            <form action={signUpAction}>
              <label className="muted">Email</label>
              <input className="input" name="email" type="email" required />
              <div style={{ height: 10 }} />
              <label className="muted">Password</label>
              <input className="input" name="password" type="password" required />
              <div style={{ height: 12 }} />
              <button className="btn secondary" type="submit">Sign up</button>
              <p className="muted" style={{ marginTop: 10 }}>If email confirmation is enabled, you'll need to confirm before logging in.</p>
            </form>
          </div>
        </>
      ) : (
        <div className="card col12">
          <div className="row">
            <form action={signOutAction}>
              <button className="btn secondary" type="submit">Sign out</button>
            </form>
            <Link className="btn" href="/">Go to Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
