
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function SchedulePage({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season")
    .eq("id", params.leagueId)
    .single();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name")
    .eq("league_id", params.leagueId);

  const teamNameById = new Map<string, string>((teams ?? []).map((t: any) => [t.id, t.name]));

  const { data: games, error } = await supabase
    .from("games")
    .select("id,season,week,status,home_team_id,away_team_id,home_score,away_score")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season ?? 1)
    .order("week", { ascending: true });

  // Group by week
  const weeks = new Map<number, any[]>();
  for (const g of games ?? []) {
    if (!weeks.has(g.week)) weeks.set(g.week, []);
    weeks.get(g.week)!.push(g);
  }

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Schedule — {league?.name}</div>
        <p className="muted">Season {league?.current_season}</p>
        {error ? <p className="error">{error.message}</p> : null}
      </div>

      {[...weeks.entries()].map(([wk, list]) => (
        <div className="card col12" key={wk}>
          <div className="h2">Week {wk}</div>
          <table className="table">
            <thead><tr><th>Game</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((g: any) => {
                const home = teamNameById.get(g.home_team_id) ?? "Home";
                const away = teamNameById.get(g.away_team_id) ?? "Away";
                const line =
                  g.status === "final"
                    ? `${away} ${g.away_score} @ ${home} ${g.home_score}`
                    : `${away} @ ${home}`;
                return (
                  <tr key={g.id}>
                    <td>{line}</td>
                    <td>{g.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
