import Link from "next/link";
import { joinLeagueAction } from "../../actions";

export default function JoinLeaguePage({ searchParams }: { searchParams?: { err?: string; ok?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const ok = searchParams?.ok ? decodeURIComponent(searchParams.ok) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Join League</div>
        <p className="muted">Enter the invite code from the commissioner.</p>
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}
      </div>

      <div className="card col6">
        <form action={joinLeagueAction}>
          <label className="small">Invite code</label>
          <input className="input" name="inviteCode" placeholder="AB12CD34" required />
          <div style={{ height: 12 }} />
          <button className="btn primary" type="submit">Join</button>
        </form>
        <div className="hr" />
        <Link className="btn" href="/">Back</Link>
      </div>
    </div>
  );
}
