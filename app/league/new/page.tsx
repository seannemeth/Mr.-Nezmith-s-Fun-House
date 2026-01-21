import { createLeagueAction } from "../../actions";

export default function NewLeaguePage({ searchParams }: { searchParams?: { err?: string; msg?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Create League</div>
        <p className="muted">Choose a preset team set, then create your dynasty.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <form action={createLeagueAction}>
          <label className="muted">League name</label>
          <input className="input" name="name" defaultValue="My Dynasty League" />
          <div style={{ height: 12 }} />

          <label className="muted">Team preset</label>
          <select className="input" name="preset" defaultValue="fbs">
            <option value="fbs">FBS-style (generic, with conferences)</option>
            <option value="small">Small (8 teams)</option>
            <option value="custom">Custom (use the box below)</option>
          </select>

          <div style={{ height: 12 }} />

          <label className="muted">Teams (one per line) — used only if preset is “Custom”</label>
          <textarea className="input" name="teams" style={{ minHeight: 220 }} placeholder="One team per line..." />

          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Create League</button>
        </form>
      </div>
    </div>
  );
}
