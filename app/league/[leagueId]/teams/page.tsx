import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function TeamsPage({ params, searchParams }: { params: { leagueId: string }; searchParams?: { err?: string; msg?: string } }) {
  const supabase = supabaseServer();
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Teams</div>
        <p className="muted">Please sign in.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: league } = await supabase.from("leagues").select("id,name,current_season,current_week").eq("id", params.leagueId).single();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id,name,short_name,conference,wins,losses,prestige,rating_off,rating_def,rating_st")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("wins", { ascending: false })
    .order("losses", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Teams — {league?.name}</div>
        <p className="muted">Season {league?.current_season}, Week {league?.current_week}. Click a team to view/edit ratings.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {error ? <p className="error">{error.message}</p> : null}
      </div>

      <div className="card col12">
        <table className="table">
          <thead>
            <tr>
              <th>Team</th><th>Conf</th><th>W-L</th><th>Prestige</th><th>OFF</th><th>DEF</th><th>ST</th>
            </tr>
          </thead>
          <tbody>
            {(teams ?? []).map((t: any) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/league/${params.leagueId}/teams/${t.id}`}>{t.name}</Link>
                  <div className="muted" style={{ fontSize: 12 }}>{t.short_name}</div>
                </td>
                <td>{t.conference}</td>
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
