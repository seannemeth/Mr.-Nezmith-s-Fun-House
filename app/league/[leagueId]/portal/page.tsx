
import { supabaseServer } from "../../../../lib/supabaseServer";
import { portalBidAction } from "../../../actions";

export default async function PortalPage({
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
  if (!userData.user) return <div className="card"><div className="h1">Transfer Portal</div><p className="muted">Please sign in.</p></div>;

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

  const { data: portal, error } = await supabase
    .from("portal_players")
    .select("id,player_name,position,rating,from_team_name,status,to_team_id")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season ?? 1)
    .order("rating", { ascending: false })
    .limit(60);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Transfer Portal — {league?.name}</div>
        <p className="muted">Bid portal points to win transfers. NIL can add leverage later. (MVP system)</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {error ? <p className="error">{error.message}</p> : null}
        {!myMembership?.team_id ? <p className="muted">Select a team in Settings to bid for transfers.</p> : null}
      </div>

      <div className="card col12">
        <table className="table">
          <thead>
            <tr><th>Player</th><th>Pos</th><th>Rating</th><th>From</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {(portal ?? []).map((p: any) => (
              <tr key={p.id}>
                <td>{p.player_name}</td>
                <td>{p.position}</td>
                <td>{p.rating}</td>
                <td>{p.from_team_name}</td>
                <td>{p.status}</td>
                <td>
                  {myMembership?.team_id && p.status === "open" ? (
                    <form action={portalBidAction} className="row">
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="portalId" value={p.id} />
                      <input className="input" style={{ width: 90 }} name="points" type="number" min={1} max={50} defaultValue={10} />
                      <button className="btn secondary" type="submit">Bid</button>
                    </form>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(!portal || portal.length === 0) ? (
              <tr><td className="muted" colSpan={6}>No portal players yet. Commissioner can initialize programs from Dashboard.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
