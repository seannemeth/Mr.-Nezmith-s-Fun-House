
import Link from "next/link";
import { supabaseServer } from "../../../lib/supabaseServer";
import { advanceWeekAction, initSeasonProgramsAction } from "../../actions";

export default async function LeaguePage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: { msg?: string; err?: string };
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">League</div>
        <p className="muted">Please sign in.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id,current_season,current_week,invite_code")
    .eq("id", params.leagueId)
    .single();

  if (leagueError || !league) {
    return (
      <div className="card">
        <div className="h1">League</div>
        <p className="error">{leagueError?.message ?? "League not found."}</p>
        <Link className="btn secondary" href="/">Home</Link>
      </div>
    );
  }

  const isCommissioner = league.commissioner_id === userData.user.id;

  const { data: games } = await supabase
    .from("games")
    .select("id,week,season,status,home_score,away_score,home_team_id,away_team_id")
    .eq("league_id", params.leagueId)
    .eq("season", league.current_season)
    .eq("week", league.current_week)
    .order("created_at", { ascending: true });

  const { data: weekTeams } = await supabase
    .from("teams")
    .select("id,name")
    .eq("league_id", params.leagueId);

  const teamNameById = new Map<string, string>(
    (weekTeams ?? []).map((t: any) => [t.id, t.name])
  );

  // Read my membership (team/role selection)
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role, team_id")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  return (
    <div className="grid">
      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">{league.name}</div>
            <p className="muted">
              Season {league.current_season} • Week {league.current_week} • Invite <b>{league.invite_code}</b>
            </p>
            <p className="muted">
              Your role: <b>{myMembership?.role ?? "member"}</b>{" "}
              {myMembership?.team_id ? "(team selected)" : "(no team yet)"}
            </p>
            {msg ? <p className="success">{msg}</p> : null}
            {err ? <p className="error">{err}</p> : null}
          </div>

          <div className="row">
            <Link className="btn secondary" href={`/league/${params.leagueId}/settings`}>Settings</Link>
            <Link className="btn secondary" href={`/league/${params.leagueId}/teams`}>Teams</Link>
            <Link className="btn secondary" href={`/league/${params.leagueId}/recruiting`}>Recruiting</Link>
          </div>
        </div>
      </div>

      <div className="card col6">
        <div className="h2">This Week</div>
        <p className="muted">Week {league.current_week} matchups.</p>

        <table className="table">
          <thead>
            <tr><th>Matchup</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(games ?? []).map((g: any) => {
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
            {(!games || games.length === 0) ? (
              <tr><td className="muted" colSpan={2}>No games scheduled.</td></tr>
            ) : null}
          </tbody>
        </table>

        {isCommissioner ? (
          <div className="row" style={{ marginTop: 12 }}>
            <form action={advanceWeekAction}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <button className="btn" type="submit">Advance Week</button>
            </form>

            <form action={initSeasonProgramsAction}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <button className="btn secondary" type="submit">Init Recruiting/Portal/NIL</button>
            </form>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            Only the commissioner can advance the week or initialize offseason programs.
          </p>
        )}
      </div>

      <div className="card col6">
        <div className="h2">Next Steps</div>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Pick a team and role in <b>Settings</b>.</li>
          <li>Recruiting: allocate weekly points to prospects and NIL deals.</li>
          <li>Portal: bid points for transfer targets.</li>
          <li>Coaches: spend skill points to improve recruiting and sim output.</li>
        </ul>
      </div>
    </div>
  );
}
