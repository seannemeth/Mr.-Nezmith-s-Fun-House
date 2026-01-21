
import { joinLeagueAction } from "../../actions";

export default function JoinLeaguePage({ searchParams }: { searchParams?: { err?: string; msg?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Join League</div>
        <p className="muted">Enter the invite code from the commissioner.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <form action={joinLeagueAction}>
          <label className="muted">Invite code</label>
          <input className="input" name="invite" placeholder="AB12CD34" />
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}
