
import { supabaseServer } from "../../../../lib/supabaseServer";
import { coachUpgradeAction } from "../../../actions";

export default async function CoachesPage({
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
  if (!userData.user) return <div className="card"><div className="h1">Coaches</div><p className="muted">Please sign in.</p></div>;

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  const { data: coach } = await supabase
    .from("coaches")
    .select("id,team_id,role,level,skill_recruiting,skill_offense,skill_defense,skill_points")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Coaches — {league?.name}</div>
        <p className="muted">
          Upgrade your staff like modern dynasty games: spend skill points on recruiting/offense/defense. (MVP system)
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col6">
        <div className="h2">Your Coach Profile</div>
        {coach ? (
          <>
            <p className="muted">Role: <b>{coach.role}</b></p>
            <p className="muted">Level: <b>{coach.level}</b></p>
            <p className="muted">Skill Points: <b>{coach.skill_points}</b></p>

            <table className="table">
              <thead><tr><th>Track</th><th>Level</th><th>Upgrade</th></tr></thead>
              <tbody>
                <tr>
                  <td>Recruiting</td>
                  <td>{coach.skill_recruiting}</td>
                  <td>
                    <form action={coachUpgradeAction}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="track" value="recruiting" />
                      <button className="btn secondary" type="submit">Upgrade</button>
                    </form>
                  </td>
                </tr>
                <tr>
                  <td>Offense</td>
                  <td>{coach.skill_offense}</td>
                  <td>
                    <form action={coachUpgradeAction}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="track" value="offense" />
                      <button className="btn secondary" type="submit">Upgrade</button>
                    </form>
                  </td>
                </tr>
                <tr>
                  <td>Defense</td>
                  <td>{coach.skill_defense}</td>
                  <td>
                    <form action={coachUpgradeAction}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="track" value="defense" />
                      <button className="btn secondary" type="submit">Upgrade</button>
                    </form>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p className="muted">Select a team and role in Settings. A coach record will be created automatically when programs are initialized.</p>
        )}
      </div>

      <div className="card col6">
        <div className="h2">How Coaching Works (MVP)</div>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Recruiting skill adds weekly recruiting points.</li>
          <li>Offense/Defense skills add small sim modifiers.</li>
          <li>Win games to earn skill points over time.</li>
          <li>Later: staff hiring, carousel, schemes, assistants.</li>
        </ul>
      </div>
    </div>
  );
}
