import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function CoachesPage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();
  const { data: coaches } = await sb
    .from("coaches")
    .select("id,team_name,role,full_name,overall,hot_seat,objective_text")
    .eq("league_id", params.leagueId)
    .order("hot_seat", { ascending: false })
    .limit(80);

  return (
    <div className="card">
      <div className="h2">Coaches</div>
      <p className="muted">Objectives + hot seat are seeded; firing/carousel is next.</p>
      <table className="table">
        <thead><tr><th>Team</th><th>Role</th><th>Coach</th><th>OVR</th><th>Hot Seat</th><th>Objective</th></tr></thead>
        <tbody>
          {(coaches || []).map((c: any) => (
            <tr key={c.id}>
              <td>{c.team_name}</td><td>{c.role}</td><td>{c.full_name}</td><td>{c.overall}</td><td>{c.hot_seat}</td><td>{c.objective_text}</td>
            </tr>
          ))}
          {(!coaches || coaches.length === 0) ? <tr><td colSpan={6} className="muted">No coaches yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
