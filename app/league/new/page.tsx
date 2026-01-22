import Link from "next/link";
import { createLeagueAction } from "../../actions";

export default function NewLeaguePage({ searchParams }: { searchParams?: { err?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Create League</div>
        <p className="muted">Choose a preset team set, then create your dynasty.</p>
        {err ? <div className="err">{err}</div> : null}
      </div>

      <div className="card col6">
        <form action={createLeagueAction}>
          <label className="small">League name</label>
          <input className="input" name="name" placeholder="My Dynasty" required />
          <div style={{ height: 10 }} />
          <label className="small">Team set</label>
          <select className="input" name="preset" defaultValue="fbs_generic">
            <option value="fbs_generic">FBS (Generic)</option>
          </select>
          <div style={{ height: 12 }} />
          <button className="btn primary" type="submit">Create League</button>
        </form>
        <div className="hr" />
        <Link className="btn" href="/">Back</Link>
      </div>

      <div className="card col6">
        <div className="h2">On creation</div>
        <ul className="muted">
          <li>All teams are created and assigned to conferences</li>
          <li>85-man rosters are auto-seeded per team</li>
          <li>Week 1 schedule is generated</li>
          <li>Recruiting class (1000+) is seeded for Season 1</li>
        </ul>
      </div>
    </div>
  );
}
