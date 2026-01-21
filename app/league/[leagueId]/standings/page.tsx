
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function StandingsPage({
  params
}: {
  params: { leagueId: string };
}) {
  const supabase = supabaseServer();

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id,name,conference,wins,losses")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("wins", { ascending: false })
    .order("losses", { ascending: true })
    .order("name", { ascending: true });

  // Group by conference
  const groups = new Map<string, any[]>();
  for (const t of teams ?? []) {
    const c = t.conference ?? "Independent";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c)!.push(t);
  }

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Standings — {league?.name}</div>
        <p className="muted">Season {league?.current_season}, Week {league?.current_week}</p>
        {error ? <p className="error">{error.message}</p> : null}
      </div>

      {[...groups.entries()].map(([conf, list]) => (
        <div className="card col6" key={conf}>
          <div className="h2">{conf}</div>
          <table className="table">
            <thead>
              <tr><th>Team</th><th>W-L</th></tr>
            </thead>
            <tbody>
              {list.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.wins}-{t.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
