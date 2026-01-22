import Link from "next/link";
import { supabaseServer } from "../../../lib/supabaseServer";
import { advanceWeekAction } from "../../actions";

export default async function LeagueDashboard({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams?: { err?: string; ok?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const ok = searchParams?.ok ? decodeURIComponent(searchParams.ok) : "";

  const sb = supabaseServer();

  const { data: standings } = await sb
    .from("teams")
    .select("id,name,wins,losses,prestige,conference_name")
    .eq("league_id", params.leagueId)
    .order("wins", { ascending: false })
    .order("prestige", { ascending: false })
    .limit(15);

  const { data: games } = await sb
    .from("games")
    .select("id,week,season,status,home_score,away_score,home_team:home_team_id(name),away_team:away_team_id(name)")
    .eq("league_id", params.leagueId)
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(12);

  return (
    <div className="grid">
      <div className="card col12">
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Commissioner tools</div>
            <p className="muted">Advance the week to simulate games and generate the next slate.</p>
          </div>

          <form action={advanceWeekAction}>
            <input type="hidden" name="leagueId" value={params.leagueId} />
            <button className="btn primary" type="submit">Advance Week</button>
          </form>
        </div>
      </div>

      <div className="card col6">
        <div className="h2">Top Standings</div>
        <table className="table">
          <thead>
            <tr><th>Team</th><th>W</th><th>L</th><th>Prestige</th></tr>
          </thead>
          <tbody>
            {(standings || []).map((t: any) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/league/${params.leagueId}/teams#${t.id}`} style={{ color: "var(--accent)" }}>
                    {t.name}
                  </Link>
                  <div className="small">{t.conference_name}</div>
                </td>
                <td>{t.wins}</td>
                <td>{t.losses}</td>
                <td>{t.prestige}</td>
              </tr>
            ))}
            {(!standings || standings.length === 0) ? (
              <tr><td colSpan={4} className="muted">No teams found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card col6">
        <div className="h2">Recent Games</div>
        <table className="table">
          <thead>
            <tr><th>Week</th><th>Matchup</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(games || []).map((g: any) => (
              <tr key={g.id}>
                <td>S{g.season} W{g.week}</td>
                <td>
                  {g.away_team?.name} @ {g.home_team?.name}
                  {g.status === "final" ? <div className="small">Final: {g.away_score}–{g.home_score}</div> : <div className="small">Scheduled</div>}
                </td>
                <td><span className="badge">{g.status}</span></td>
              </tr>
            ))}
            {(!games || games.length === 0) ? (
              <tr><td colSpan={3} className="muted">No games yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card col12">
        <div className="h2">Next steps</div>
        <ul className="muted">
          <li><Link href={`/league/${params.leagueId}/settings`} style={{ color: "var(--accent)" }}>Select your team and role</Link></li>
          <Link className="btn secondary" href={`/league/${params.leagueId}/team-role`}> Team & Role</Link>
          <li>Recruiting / Portal / NIL pages are wired to the database and ready for gameplay rules.</li>
          <li>News and storylines can be added via a “news” table + generator function later.</li>
        </ul>
      </div>
    </div>
  );
}
