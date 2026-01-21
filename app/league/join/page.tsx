import { joinLeagueAction } from "../../actions";

export default function JoinLeaguePage({ searchParams }: { searchParams?: { err?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Join League</div>
        <p className="muted">Enter the invite code from your commissioner.</p>
        {err ? <p className="error">{err}</p> : null}
        <form action={joinLeagueAction}>
          <input className="input" name="code" placeholder="INVITE CODE (8 chars)" />
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}
