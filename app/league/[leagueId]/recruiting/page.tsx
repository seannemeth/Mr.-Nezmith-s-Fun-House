import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

type SP = {
  q?: string;
  pos?: string;
  state?: string;
  minStars?: string;
  archetype?: string;
  msg?: string;
  err?: string;
};

const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];

async function addToBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId || !recruitId) redirect(`/`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("add_recruit_to_board", {
    p_league_id: leagueId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Added to recruiting board.")}`);
}

async function removeFromBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId || !recruitId) redirect(`/`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_recruit_from_board", {
    p_league_id: leagueId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Removed from board.")}`);
}

async function scoutAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId || !recruitId) redirect(`/`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("scout_recruit", {
    p_league_id: leagueId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Scouting report updated.")}`);
}

export default async function RecruitingPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: SP;
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const q = (searchParams?.q || "").trim();
  const pos = (searchParams?.pos || "").trim();
  const state = (searchParams?.state || "").trim();
  const archetype = (searchParams?.archetype || "").trim();
  const minStars = Math.max(0, Math.min(5, parseInt(searchParams?.minStars || "0", 10) || 0));

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season")
    .eq("id", params.leagueId)
    .single();

  // Determine my team (must have chosen team & role)
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!myMembership?.team_id) {
    redirect(`/league/${params.leagueId}/team-role?err=${enc("Pick a team and role before recruiting.")}`);
  }

  const myTeamId = myMembership.team_id;

  // Load my board (ids)
  const { data: boardRows } = await supabase
    .from("recruiting_board")
    .select("recruit_id,created_at,priority")
    .eq("league_id", params.leagueId)
    .eq("team_id", myTeamId)
    .order("created_at", { ascending: false });

  const boardIds = (boardRows || []).map((r: any) => r.recruit_id);

  // Pull recruits for board
  const { data: boardRecruits } = boardIds.length
    ? await supabase
        .from("recruits")
        .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,committed_team_id")
        .in("id", boardIds)
    : { data: [] as any[] };

  // Build search query
  let recruitsQuery = supabase
    .from("recruits")
    .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,committed_team_id")
    .eq("league_id", params.leagueId);

  if (league?.current_season) recruitsQuery = recruitsQuery.eq("season", league.current_season);
  if (q) recruitsQuery = recruitsQuery.ilike("name", `%${q}%`);
  if (pos) recruitsQuery = recruitsQuery.eq("position", pos);
  if (state) recruitsQuery = recruitsQuery.eq("state", state);
  if (archetype) recruitsQuery = recruitsQuery.ilike("archetype", `%${archetype}%`);
  if (minStars > 0) recruitsQuery = recruitsQuery.gte("stars", minStars);

  const { data: searchRecruits } = await recruitsQuery
    .order("stars", { ascending: false })
    .order("rank", { ascending: true })
    .limit(200);

  // Fetch scouting for any recruits shown (board + search)
  const allShownIds = Array.from(new Set([...(boardIds || []), ...((searchRecruits || []).map((r: any) => r.id))]));
  const { data: scoutingRows } = allShownIds.length
    ? await supabase
        .from("recruit_scouting")
        .select("recruit_id,reveal_level,est_ovr,revealed")
        .eq("league_id", params.leagueId)
        .eq("team_id", myTeamId)
        .in("recruit_id", allShownIds)
    : { data: [] as any[] };

  const scoutingMap = new Map<string, any>();
  (scoutingRows || []).forEach((s: any) => scoutingMap.set(s.recruit_id, s));

  const boardSet = new Set(boardIds);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Recruiting — {league?.name}</div>
        <p className="muted">
          Recruiting Board v1: add recruits to your board, scout to reveal estimated OVR + key attributes.
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <Link className="btn secondary" href={`/league/${params.leagueId}`}>Back</Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/team-role`}>Team & Role</Link>
        </div>
      </div>

      {/* Board */}
      <div className="card col12">
        <div className="h2">Your Recruiting Board</div>
        <p className="muted">Tracked recruits for your team. Scout to reveal more info.</p>

        {(boardRecruits || []).length === 0 ? (
          <p className="muted">Board is empty. Use the search below to add recruits.</p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Name</th>
                <th>Stars</th>
                <th>Rank</th>
                <th>State</th>
                <th>Ht/Wt</th>
                <th>Archetype</th>
                <th>Scout</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(boardRecruits || []).map((r: any) => {
                const s = scoutingMap.get(r.id);
                const scouted = !!s;
                const ht = r.height_in ? `${Math.floor(r.height_in / 12)}'${r.height_in % 12}"` : "—";
                const wt = r.weight_lb ? `${r.weight_lb}` : "—";
                const est = scouted ? `${s.est_ovr ?? "—"} (≈)` : "—";

                return (
                  <tr key={r.id}>
                    <td>{r.position}</td>
                    <td>{r.name}</td>
                    <td>{"★".repeat(Math.max(1, Math.min(5, r.stars || 1)))}</td>
                    <td>#{r.rank ?? "—"}</td>
                    <td>{r.state ?? "—"}</td>
                    <td>{ht} / {wt}</td>
                    <td>{r.archetype ?? "—"}</td>
                    <td>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {scouted ? `Est OVR: ${est} · Reveal: ${s.reveal_level}%` : "Not scouted"}
                      </div>
                      {scouted ? (
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {Object.entries(s.revealed || {}).map(([k, v]: any) => (
                            <span key={k} style={{ marginRight: 10 }}>{k}: {String(v ?? "—")}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <form action={scoutAction}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="recruitId" value={r.id} />
                        <button className="btn" type="submit" disabled={scouted}>
                          {scouted ? "Scouted" : "Scout"}
                        </button>
                      </form>
                      <form action={removeFromBoardAction}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="recruitId" value={r.id} />
                        <button className="btn secondary" type="submit">Remove</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Search */}
      <div className="card col12">
        <div className="h2">Recruit Search</div>
        <form method="get" className="grid" style={{ gap: 10, marginTop: 10 }}>
          <div className="col12">
            <label className="label">Name</label>
            <input className="input" name="q" placeholder="Search by name..." defaultValue={q} />
          </div>

          <div className="col6">
            <label className="label">Position</label>
            <select className="input" name="pos" defaultValue={pos}>
              <option value="">Any</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="col6">
            <label className="label">State</label>
            <input className="input" name="state" placeholder="e.g. FL, TX, CA" defaultValue={state} />
          </div>

          <div className="col6">
            <label className="label">Min Stars</label>
            <select className="input" name="minStars" defaultValue={String(minStars)}>
              <option value="0">Any</option>
              <option value="2">2★+</option>
              <option value="3">3★+</option>
              <option value="4">4★+</option>
              <option value="5">5★ only</option>
            </select>
          </div>

          <div className="col6">
            <label className="label">Archetype (contains)</label>
            <input className="input" name="archetype" placeholder="e.g. Scrambler" defaultValue={archetype} />
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">Search</button>
            <Link className="btn secondary" href={`/league/${params.leagueId}/recruiting`}>Reset</Link>
          </div>
        </form>

        <div style={{ marginTop: 14 }}>
          <div className="muted">Showing up to 200 recruits (sorted by stars then rank).</div>

          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Name</th>
                <th>Stars</th>
                <th>Rank</th>
                <th>State</th>
                <th>Ht/Wt</th>
                <th>Archetype</th>
                <th>Est OVR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(searchRecruits || []).map((r: any) => {
                const onBoard = boardSet.has(r.id);
                const s = scoutingMap.get(r.id);
                const scouted = !!s;
                const ht = r.height_in ? `${Math.floor(r.height_in / 12)}'${r.height_in % 12}"` : "—";
                const wt = r.weight_lb ? `${r.weight_lb}` : "—";

                return (
                  <tr key={r.id}>
                    <td>{r.position}</td>
                    <td>{r.name}</td>
                    <td>{"★".repeat(Math.max(1, Math.min(5, r.stars || 1)))}</td>
                    <td>#{r.rank ?? "—"}</td>
                    <td>{r.state ?? "—"}</td>
                    <td>{ht} / {wt}</td>
                    <td>{r.archetype ?? "—"}</td>
                    <td>{scouted ? `${s.est_ovr ?? "—"} (≈)` : "—"}</td>
                    <td className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <form action={addToBoardAction}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="recruitId" value={r.id} />
                        <button className="btn" type="submit" disabled={onBoard}>
                          {onBoard ? "On Board" : "Add"}
                        </button>
                      </form>

                      <form action={scoutAction}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="recruitId" value={r.id} />
                        <button className="btn secondary" type="submit" disabled={scouted}>
                          {scouted ? "Scouted" : "Scout"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {(!searchRecruits || searchRecruits.length === 0) ? (
                <tr>
                  <td className="muted" colSpan={9}>No recruits matched your filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
