import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function PortalPage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();
  const { data: entries } = await sb
    .from("portal_players")
    .select("id,full_name,position,overall,year,from_team_name")
    .eq("league_id", params.leagueId)
    .order("overall", { ascending: false })
    .limit(150);

  return (
    <div className="card">
      <div className="h2">Transfer Portal</div>
      <p className="muted">Portal entries are seeded; bidding/decisions are next.</p>
      <table className="table">
        <thead><tr><th>Player</th><th>Pos</th><th>OVR</th><th>Year</th><th>From</th></tr></thead>
        <tbody>
          {(entries || []).map((p: any) => (
            <tr key={p.id}><td>{p.full_name}</td><td>{p.position}</td><td>{p.overall}</td><td>{p.year}</td><td>{p.from_team_name}</td></tr>
          ))}
          {(!entries || entries.length === 0) ? <tr><td colSpan={5} className="muted">No portal players yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
