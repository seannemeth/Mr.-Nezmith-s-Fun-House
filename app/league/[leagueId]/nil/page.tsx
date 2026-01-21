
import { supabaseServer } from "../../../../lib/supabaseServer";
import { nilDealAction } from "../../../actions";

export default async function NilPage({
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
  if (!userData.user) return <div className="card"><div className="h1">NIL</div><p className="muted">Please sign in.</p></div>;

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  const { data: budget } = await supabase
    .from("team_budgets")
    .select("nil_budget")
    .eq("league_id", params.leagueId)
    .eq("team_id", myMembership?.team_id ?? "00000000-0000-0000-0000-000000000000")
    .single();

  const { data: deals } = await supabase
    .from("nil_offers")
    .select("id,target_type,target_name,amount,status,created_at")
    .eq("league_id", params.leagueId)
    .eq("team_id", myMembership?.team_id ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">NIL — {league?.name}</div>
        <p className="muted">
          NIL is a budget you can use to boost recruiting and portal success. (MVP system)
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {myMembership?.team_id ? (
          <p className="muted">Your NIL budget: <b>${budget?.nil_budget ?? 0}</b></p>
        ) : (
          <p className="muted">Select a team in Settings to use NIL.</p>
        )}
      </div>

      <div className="card col6">
        <div className="h2">Make an NIL Offer</div>
        {myMembership?.team_id ? (
          <form action={nilDealAction}>
            <input type="hidden" name="leagueId" value={params.leagueId} />

            <label className="muted">Target type</label>
            <select className="input" name="targetType" defaultValue="recruit">
              <option value="recruit">Recruit</option>
              <option value="portal">Portal player</option>
            </select>

            <div style={{ height: 10 }} />
            <label className="muted">Target ID (from Recruiting/Portal list)</label>
            <input className="input" name="targetId" placeholder="Paste the recruit/player id" />

            <div style={{ height: 10 }} />
            <label className="muted">Amount</label>
            <input className="input" name="amount" type="number" min={0} defaultValue={25000} />

            <div style={{ height: 12 }} />
            <button className="btn" type="submit">Submit Offer</button>

            <p className="muted" style={{ marginTop: 10 }}>
              MVP: For now, you paste the target id. Next iteration: click-to-offer.
            </p>
          </form>
        ) : (
          <p className="muted">Select a team in Settings.</p>
        )}
      </div>

      <div className="card col6">
        <div className="h2">Your NIL Offers</div>
        <table className="table">
          <thead><tr><th>Target</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {(deals ?? []).map((d: any) => (
              <tr key={d.id}>
                <td>{d.target_type}: {d.target_name}</td>
                <td>${d.amount}</td>
                <td>{d.status}</td>
              </tr>
            ))}
            {(!deals || deals.length === 0) ? (
              <tr><td className="muted" colSpan={3}>No NIL offers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
