import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function SchedulePage({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();

  const { data: league } = await supabase
    .from("leagues")
    .select("current_season")
    .eq("id", params.leagueId)
    .single();

  const { data: games } = await supabase
    .from("games")
    .select("week,status,home_score,away_score, teams_home:teams!games_home_team_id_fkey(name), teams_away:teams!games_away_team_id_fkey(name)")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season ?? 1)
    .order("week", { ascending: true });

  return (
    <div className="card">
      <div className="h1">Schedule (Season {league?.current_season ?? 1})</div>
      <table className="table">
        <thead>
          <tr><th>Week</th><th>Matchup</th><th>Status</th><th>Score</th></tr>
        </thead>
        <tbody>
          {(games ?? []).map((g: any, i: number) => (
            <tr key={i}>
              <td>{g.week}</td>
              <td>{g.teams_home?.name} vs {g.teams_away?.name}</td>
              <td>{g.status}</td>
              <td>{g.status === "final" ? `${g.home_score}-${g.away_score}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
