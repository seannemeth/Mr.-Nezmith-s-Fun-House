import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function StandingsPage({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Standings</div>
        <p className="muted">Please sign in.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: league } = await supabase.from("leagues").select("id,name").eq("id", params.leagueId).single();
  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,conference,wins,losses")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("wins", { ascending: false })
    .order("losses", { ascending: true })
    .order("name", { ascending: true });

  const groups = new Map<string, any[]>();
  for (const t of teams ?? []) {
    const conf = (t as any).conference ?? "Independent";
    if (!groups.has(conf)) groups.set(conf, []);
    groups.get(conf)!.push(t);
  }

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Standings — {league?.name}</div>
        <p className="muted">Conference standings (overall record for now).</p>
      </div>

      {[...groups.entries()].map(([conf, list]) => (
        <div key={conf} className="card col6">
          <div className="h2">{conf}</div>
          <table className="table">
            <thead><tr><th>Team</th><th>W-L</th></tr></thead>
            <tbody>
              {list.map((t: any) => (
                <tr key={t.id}>
                  <td><Link href={`/league/${params.leagueId}/teams/${t.id}`}>{t.name}</Link></td>
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
