import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function SchedulePage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();

  const { data: league } = await sb
    .from("leagues")
    .select("current_season,current_week")
    .eq("id", params.leagueId)
    .maybeSingle();

  const { data: games, error } = await sb
    .from("games")
    .select("id,season,week,status,home_score,away_score,home_team:home_team_id(name),away_team:away_team_id(name)")
    .eq("league_id", params.leagueId)
    .order("season", { ascending: true })
    .order("week", { ascending: true });

  if (error) return <div className="card"><div className="h2">Schedule</div><div className="err">{error.message}</div></div>;

  return (
    <div className="card">
      <div className="h2">Schedule</div>
      <p className="muted">Season {league?.current_season} — current week {league?.current_week}</p>
      <table className="table">
        <thead><tr><th>Season</th><th>Week</th><th>Matchup</th><th>Status</th></tr></thead>
        <tbody>
          {(games || []).map((g: any) => (
            <tr key={g.id}>
              <td>{g.season}</td>
              <td>{g.week}</td>
              <td>
                {g.away_team?.name} @ {g.home_team?.name}
                {g.status === "final" ? <div className="small">Final: {g.away_score}–{g.home_score}</div> : null}
              </td>
              <td><span className="badge">{g.status}</span></td>
            </tr>
          ))}
          {(!games || games.length === 0) ? <tr><td colSpan={4} className="muted">No games.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
