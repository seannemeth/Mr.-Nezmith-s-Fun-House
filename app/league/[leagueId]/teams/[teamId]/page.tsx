
import Link from "next/link";
import { supabaseServer } from "../../../../../lib/supabaseServer";
import { updateTeamAction } from "../../../../actions";

export default async function TeamPage({
  params,
  searchParams
}: {
  params: { leagueId: string; teamId: string };
  searchParams?: { err?: string; msg?: string };
}) {
  const supabase = supabaseServer();

  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Team</div>
        <p className="muted">Please sign in.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id")
    .eq("id", params.leagueId)
    .single();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id,league_id,name,short_name,conference,wins,losses,prestige,rating_off,rating_def,rating_st")
    .eq("id", params.teamId)
    .eq("league_id", params.leagueId)
    .single();

  if (teamError || !team) {
    return (
      <div className="card">
        <div className="h1">Team</div>
        <p className="error">{teamError?.message ?? "Team not found."}</p>
        <Link className="btn secondary" href={`/league/${params.leagueId}/teams`}>Back to Teams</Link>
      </div>
    );
  }

  const isCommissioner = league?.commissioner_id === userData.user.id;

  return (
    <div className="grid">
      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">{team.name}</div>
            <p className="muted">
              {league?.name} • {team.conference} • Record {team.wins}-{team.losses}
            </p>
            {msg ? <p className="success">{msg}</p> : null}
            {err ? <p className="error">{err}</p> : null}
          </div>
          <div className="row">
            <Link className="btn secondary" href={`/league/${params.leagueId}/teams`}>Teams</Link>
            <Link className="btn secondary" href={`/league/${params.leagueId}`}>League</Link>
          </div>
        </div>
      </div>

      <div className="card col6">
        <div className="h2">Ratings</div>
        <table className="table">
          <tbody>
            <tr><th>Prestige</th><td>{team.prestige}</td></tr>
            <tr><th>OFF</th><td>{team.rating_off}</td></tr>
            <tr><th>DEF</th><td>{team.rating_def}</td></tr>
            <tr><th>ST</th><td>{team.rating_st}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card col6">
        <div className="h2">Edit Team</div>
        {isCommissioner ? (
          <form action={updateTeamAction}>
            <input type="hidden" name="leagueId" value={params.leagueId} />
            <input type="hidden" name="teamId" value={params.teamId} />

            <label className="muted">Name</label>
            <input className="input" name="name" defaultValue={team.name} />
            <div style={{ height: 10 }} />

            <label className="muted">Short name</label>
            <input className="input" name="short_name" defaultValue={team.short_name} />
            <div style={{ height: 10 }} />

            <label className="muted">Conference</label>
            <input className="input" name="conference" defaultValue={team.conference} />
            <div style={{ height: 10 }} />

            <div className="grid">
              <div className="col6">
                <label className="muted">Prestige (0–100)</label>
                <input className="input" name="prestige" type="number" min={0} max={100} defaultValue={team.prestige} />
              </div>
              <div className="col6">
                <label className="muted">OFF (0–100)</label>
                <input className="input" name="rating_off" type="number" min={0} max={100} defaultValue={team.rating_off} />
              </div>
              <div className="col6">
                <label className="muted">DEF (0–100)</label>
                <input className="input" name="rating_def" type="number" min={0} max={100} defaultValue={team.rating_def} />
              </div>
              <div className="col6">
                <label className="muted">ST (0–100)</label>
                <input className="input" name="rating_st" type="number" min={0} max={100} defaultValue={team.rating_st} />
              </div>
            </div>

            <div style={{ height: 12 }} />
            <button className="btn" type="submit">Save Changes</button>
          </form>
        ) : (
          <p className="muted">Only the commissioner can edit team details right now.</p>
        )}
      </div>
    </div>
  );
}
