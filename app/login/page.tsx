import Link from "next/link";
import { signInAction, signUpAction } from "../actions";

export default function LoginPage({ searchParams }: { searchParams?: { err?: string; ok?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const ok = searchParams?.ok ? decodeURIComponent(searchParams.ok) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Sign in</div>
        <p className="muted">You need an account to create or join leagues.</p>
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}
      </div>

      <div className="card col6">
        <div className="h2">Sign in</div>
        <form action={signInAction}>
          <label className="small">Email</label>
          <input className="input" name="email" type="email" required />
          <div style={{ height: 8 }} />
          <label className="small">Password</label>
          <input className="input" name="password" type="password" required />
          <div style={{ height: 12 }} />
          <button className="btn primary" type="submit">Sign in</button>
        </form>
      </div>

      <div className="card col6">
        <div className="h2">Create account</div>
        <form action={signUpAction}>
          <label className="small">Email</label>
          <input className="input" name="email" type="email" required />
          <div style={{ height: 8 }} />
          <label className="small">Password</label>
          <input className="input" name="password" type="password" required />
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Sign up</button>
        </form>
        <div className="hr" />
        <p className="small">
          If your project requires email confirmation, confirm before sign-in works.
        </p>
        <p className="small"><Link href="/">Go back</Link></p>
      </div>
    </div>
  );
}
