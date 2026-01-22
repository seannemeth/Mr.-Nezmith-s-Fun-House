import { supabaseServer } from "../../../../lib/supabaseServer";

const POS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];

export default async function RecruitingPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams?: { q?: string; pos?: string; state?: string; minStars?: string };
}) {
  const sb = supabaseServer();

  const q = (searchParams?.q || "").trim();
  const pos = (searchParams?.pos || "").trim();
  const state = (searchParams?.state || "").trim();
  const minStars = Number(searchParams?.minStars || "0");

  const { data: league } = await sb
    .from("leagues")
    .select("current_season")
    .eq("id", params.leagueId)
    .maybeSingle();

  let query = sb
    .from("recruits")
    .select("id,full_name,position,archetype,state,height_in,weight_lb,stars,quality")
    .eq("league_id", params.leagueId)
    .eq("season", league?.current_season || 1);

  if (q) query = query.ilike("full_name", `%${q}%`);
  if (pos && POS.includes(pos)) query = query.eq("position", pos);
  if (state) query = query.eq("state", state);
  if (minStars > 0) query = query.gte("stars", minStars);

  const { data: recruits, error } = await query
    .order("stars", { ascending: false })
    .order("quality", { ascending: false })
    .limit(250);

  const statesRes = await sb.rpc("distinct_recruit_states", { p_league_id: params.leagueId, p_season: league?.current_season || 1 });
  const stateList = Array.isArray(statesRes.data) ? statesRes.data : [];

  if (error) return <div className="card"><div className="h2">Recruiting</div><div className="err">{error.message}</div></div>;

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h2">Recruiting Board</div>
        <p className="muted">1000+ auto-generated recruits per season. Scout archetypes and attributes (next).</p>

        <form className="row" method="get">
          <input className="input" name="q" placeholder="Search name…" defaultValue={q} style={{ maxWidth: 260 }} />
          <select className="input" name="pos" defaultValue={pos} style={{ maxWidth: 140 }}>
            <option value="">All positions</option>
            {POS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select className="input" name="state" defaultValue={state} style={{ maxWidth: 220 }}>
            <option value="">All states</option>
            {stateList.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="input" name="minStars" defaultValue={String(minStars)} style={{ maxWidth: 160 }}>
            <option value="0">All stars</option>
            <option value="2">2★+</option>
            <option value="3">3★+</option>
            <option value="4">4★+</option>
            <option value="5">5★ only</option>
          </select>

          <button className="btn primary" type="submit">Filter</button>
        </form>
      </div>

      <div className="card col12">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Pos</th><th>Type</th><th>State</th><th>Ht/Wt</th><th>Stars</th><th>Quality</th></tr>
          </thead>
          <tbody>
            {(recruits || []).map((r: any) => (
              <tr key={r.id}>
                <td>{r.full_name}</td>
                <td>{r.position}</td>
                <td>{r.archetype}</td>
                <td>{r.state}</td>
                <td>{r.height_in}" / {r.weight_lb} lb</td>
                <td>{"★".repeat(r.stars)}</td>
                <td>{r.quality}</td>
              </tr>
            ))}
            {(!recruits || recruits.length === 0) ? <tr><td colSpan={7} className="muted">No recruits match your filters.</td></tr> : null}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 10 }}>Showing up to 250 results.</p>
      </div>
    </div>
  );
}
