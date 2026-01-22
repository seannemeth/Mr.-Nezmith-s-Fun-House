import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function TeamsPage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();
  const { data: teams, error } = await sb
    .from("teams")
    .select("id,name,conference_name,prestige,rating_off,rating_def,rating_st,wins,losses")
    .eq("league_id", params.leagueId)
    .order("conference_name", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return <div className="card"><div className="h2">Teams</div><div className="err">{error.message}</div></div>;
  }

  return (
    <div className="card">
      <div className="h2">Teams</div>
      <p className="muted">Conference list with baseline ratings (editing comes next).</p>
      <table className="table">
        <thead>
          <tr><th>Conference</th><th>Team</th><th>W-L</th><th>Prestige</th><th>OFF</th><th>DEF</th><th>ST</th></tr>
        </thead>
        <tbody>
          {(teams || []).map((t: any) => (
            <tr key={t.id} id={t.id}>
              <td>{t.conference_name}</td>
              <td>{t.name}</td>
              <td>{t.wins}-{t.losses}</td>
              <td>{t.prestige}</td>
              <td>{t.rating_off}</td>
              <td>{t.rating_def}</td>
              <td>{t.rating_st}</td>
            </tr>
          ))}
          {(!teams || teams.length === 0) ? <tr><td colSpan={7} className="muted">No teams found.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
