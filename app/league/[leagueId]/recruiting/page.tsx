
import { supabaseServer } from "../../../../lib/supabaseServer";
import { recruitingOfferAction } from "../../../actions";

export default async function RecruitingPage({
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
        <div className="h1">Recruiting</div>
        <p className="muted">Please sign in.</p>
      </div>
    );
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id, role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  const { data: budget } = await supabase
    .from("team_budgets")
    .select("recruiting_points,nil_budget")
    .eq("league_id", params.leagueId)
    .eq("team_id", myMembership?.team_id ?? "00000000-0000-0000-0000-000000000000")
    .single();

  const { data: recruits, error } = await supabase
    .from("recruits")
    .select("id,name,position,stars,rank,committed_team_id")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season ?? 1)
    .order("rank", { ascending: true })
    .limit(60);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Recruiting — {league?.name}</div>
        <p className="muted">
          Week {league?.current_week}. Spend weekly recruiting points to increase interest. NIL offers can further boost. (MVP system)
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {error ? <p className="error">{error.message}</p> : null}

        {myMembership?.team_id ? (
          <p className="muted">
            Your team budget: Recruiting Points <b>{budget?.recruiting_points ?? 0}</b> • NIL Budget <b>${budget?.nil_budget ?? 0}</b>
          </p>
        ) : (
          <p className="muted">Select a team in Settings to participate in recruiting.</p>
        )}
      </div>

      <div className="card col12">
        <div className="h2">Top Recruits</div>
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th><th>Name</th><th>Pos</th><th>Stars</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(recruits ?? []).map((r: any) => (
              <tr key={r.id}>
                <td>{r.rank}</td>
                <td>{r.name}</td>
                <td>{r.position}</td>
                <td>{"★".repeat(r.stars)}</td>
                <td>{r.committed_team_id ? "Committed" : "Open"}</td>
                <td>
                  {myMembership?.team_id && !r.committed_team_id ? (
                    <form action={recruitingOfferAction} className="row">
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="recruitId" value={r.id} />
                      <input className="input" style={{ width: 90 }} name="points" type="number" min={1} max={50} defaultValue={10} />
                      <button className="btn secondary" type="submit">Offer</button>
                    </form>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(!recruits || recruits.length === 0) ? (
              <tr><td className="muted" colSpan={6}>No recruits found. Commissioner can initialize programs from Dashboard.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
