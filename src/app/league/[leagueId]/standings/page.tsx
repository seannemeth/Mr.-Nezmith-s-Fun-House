import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function StandingsPage({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();
  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,wins,losses,prestige,rating_off,rating_def,rating_st")
    .eq("league_id", params.leagueId)
    .order("wins", { ascending: false })
    .order("losses", { ascending: true });

  return (
    <div className="card">
      <div className="h1">Standings</div>
      <table className="table">
        <thead>
          <tr><th>Team</th><th>W</th><th>L</th><th>Prestige</th><th>OFF</th><th>DEF</th><th>ST</th></tr>
        </thead>
        <tbody>
          {(teams ?? []).map((t: any) => (
            <tr key={t.id}>
              <td>{t.name}</td><td>{t.wins}</td><td>{t.losses}</td>
              <td>{t.prestige}</td><td>{t.rating_off}</td><td>{t.rating_def}</td><td>{t.rating_st}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
