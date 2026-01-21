import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function SchedulePage({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Schedule</div>
        <p className="muted">Please sign in.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: league } = await supabase.from("leagues").select("id,name,current_season").eq("id", params.leagueId).single();
  const { data: teams } = await supabase.from("teams").select("id,name").eq("league_id", params.leagueId);
  const nameById = new Map<string, string>((teams ?? []).map((t: any) => [t.id, t.name]));

  const { data: games } = await supabase
    .from("games")
    .select("id,season,week,status,home_team_id,away_team_id,home_score,away_score")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season ?? 1)
    .order("week", { ascending: true });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Schedule — {league?.name}</div>
        <p className="muted">Season {league?.current_season}. Basic week schedule.</p>
      </div>

      <div className="card col12">
        <table className="table">
          <thead><tr><th>Week</th><th>Matchup</th><th>Status</th></tr></thead>
          <tbody>
            {(games ?? []).map((g: any) => {
              const home = nameById.get(g.home_team_id) ?? "Home";
              const away = nameById.get(g.away_team_id) ?? "Away";
              const line = g.status === "final" ? `${away} ${g.away_score} @ ${home} ${g.home_score}` : `${away} @ ${home}`;
              return (
                <tr key={g.id}>
                  <td>{g.week}</td>
                  <td>{line}</td>
                  <td>{g.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
