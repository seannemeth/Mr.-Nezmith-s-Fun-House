import Link from "next/link";
import { supabaseServer } from "../../../lib/supabaseServer";
import { advanceWeek } from "../../../actions";

export default async function LeagueDashboard({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return <div className="card">Please sign in.</div>;

  const leagueId = params.leagueId;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", userData.user.id)
    .single();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,wins,losses,prestige,rating_off,rating_def,rating_st")
    .eq("league_id", leagueId)
    .order("wins", { ascending: false })
    .order("losses", { ascending: true });

  const { data: games } = await supabase
    .from("games")
    .select("season,week,status,home_score,away_score,home_team_id,away_team_id, teams_home:teams!games_home_team_id_fkey(name), teams_away:teams!games_away_team_id_fkey(name)")
    .eq("league_id", leagueId)
    .eq("season", league?.current_season ?? 1)
    .eq("week", league?.current_week ?? 1)
    .order("created_at", { ascending: true });

  const isCommissioner = membership?.role === "commissioner";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">{league?.name}</div>
            <div className="muted">
              Season {league?.current_season}, Week {league?.current_week} • Invite: <b>{league?.invite_code}</b>
            </div>
          </div>
          <div className="row">
            <Link className="btn secondary" href={`/league/${leagueId}/standings`}>Standings</Link>
            <Link className="btn secondary" href={`/league/${leagueId}/schedule`}>Schedule</Link>
            {isCommissioner ? (
              <form action={async () => { "use server"; await advanceWeek(leagueId); }}>
                <button className="btn" type="submit">Advance Week</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card col6">
        <div className="h2">This Week’s Games</div>
        <table className="table">
          <thead>
            <tr><th>Matchup</th><th>Status</th><th>Score</th></tr>
          </thead>
          <tbody>
            {(games ?? []).map((g: any, idx: number) => (
              <tr key={idx}>
                <td>{g.teams_home?.name} vs {g.teams_away?.name}</td>
                <td>{g.status}</td>
                <td>{g.status === "final" ? `${g.home_score}-${g.away_score}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 10 }}>
          Commissioner advances the week to simulate results and generate the next week’s schedule.
        </p>
      </div>

      <div className="card col6">
        <div className="h2">Teams</div>
        <table className="table">
          <thead>
            <tr><th>Team</th><th>W-L</th><th>Prestige</th><th>OFF</th><th>DEF</th><th>ST</th></tr>
          </thead>
          <tbody>
            {(teams ?? []).map((t: any) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.wins}-{t.losses}</td>
                <td>{t.prestige}</td>
                <td>{t.rating_off}</td>
                <td>{t.rating_def}</td>
                <td>{t.rating_st}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
