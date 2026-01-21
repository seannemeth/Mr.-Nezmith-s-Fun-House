import { signIn, signOut, signUp } from "../actions";
import { supabaseServer } from "../../lib/supabaseServer";

export default async function LoginPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Account</div>
        {user ? (
          <>
            <p className="muted">Signed in as <b>{user.email}</b></p>
            <form action={async () => { "use server"; await signOut(); }}>
              <button className="btn" type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <div className="grid">
            <div className="card col6">
              <div className="h2">Sign in</div>
              <form
                action={async (formData) => {
                  "use server";
                  await signIn(String(formData.get("email")), String(formData.get("password")));
                }}
              >
                <input className="input" name="email" placeholder="Email" />
                <div style={{ height: 10 }} />
                <input className="input" name="password" placeholder="Password" type="password" />
                <div style={{ height: 12 }} />
                <button className="btn" type="submit">Sign in</button>
              </form>
            </div>

            <div className="card col6">
              <div className="h2">Create account</div>
              <form
                action={async (formData) => {
                  "use server";
                  await signUp(String(formData.get("email")), String(formData.get("password")));
                }}
              >
                <input className="input" name="email" placeholder="Email" />
                <div style={{ height: 10 }} />
                <input className="input" name="password" placeholder="Password" type="password" />
                <div style={{ height: 12 }} />
                <button className="btn" type="submit">Sign up</button>
              </form>
              <p className="muted" style={{ marginTop: 10 }}>
                Email confirmation may be required depending on Supabase settings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
