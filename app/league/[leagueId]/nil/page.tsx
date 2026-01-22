import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function NilPage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();
  const { data: budgets } = await sb
    .from("team_budgets")
    .select("team_name,season,nil_budget,nil_spent")
    .eq("league_id", params.leagueId)
    .order("nil_budget", { ascending: false })
    .limit(40);

  return (
    <div className="card">
      <div className="h2">NIL</div>
      <p className="muted">Budgets are seeded per team; offers/negotiations come next.</p>
      <table className="table">
        <thead><tr><th>Team</th><th>Season</th><th>NIL Budget</th><th>Spent</th></tr></thead>
        <tbody>
          {(budgets || []).map((b: any) => (
            <tr key={b.team_name}>
              <td>{b.team_name}</td>
              <td>{b.season}</td>
              <td>${Number(b.nil_budget).toLocaleString()}</td>
              <td>${Number(b.nil_spent).toLocaleString()}</td>
            </tr>
          ))}
          {(!budgets || budgets.length === 0) ? <tr><td colSpan={4} className="muted">No budgets yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
