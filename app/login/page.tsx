import { supabaseServer } from "../../lib/supabaseServer";
import { signInAction, signOutAction, signUpAction } from "../actions";

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

        {user ? (
          <>
            <p className="muted">Signed in as <b>{user.email}</b></p>
            <form action={signOutAction}>
              <button className="btn" type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <div className="grid">
            <div className="card col6">
              <div className="h2">Sign in</div>
              <form action={signInAction}>
                <input className="input" name="email" placeholder="Email" />
                <div style={{ height: 10 }} />
                <input className="input" name="password" placeholder="Password" type="password" />
                <div style={{ height: 12 }} />
                <button className="btn" type="submit">Sign in</button>
              </form>
              <p className="muted" style={{ marginTop: 10 }}>
                If email confirmation is enabled in Supabase, confirm your email before signing in.
              </p>
            </div>

            <div className="card col6">
              <div className="h2">Create account</div>
              <form action={signUpAction}>
                <input className="input" name="email" placeholder="Email" />
                <div style={{ height: 10 }} />
                <input className="input" name="password" placeholder="Password" type="password" />
                <div style={{ height: 12 }} />
                <button className="btn" type="submit">Sign up</button>
              </form>
              <p className="muted" style={{ marginTop: 10 }}>
                After signing up, check your email for a confirmation link if confirmations are enabled.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
