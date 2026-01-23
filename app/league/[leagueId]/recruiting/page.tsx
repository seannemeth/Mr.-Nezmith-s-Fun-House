import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";
import {
  addToBoardAction,
  removeFromBoardAction,
  scheduleVisitAction,
  setPipelineAction,
  removePipelineAction
} from "./actions";

function enc(s: string) {
  return encodeURIComponent(s);
}

function stars(n: number) {
  const v = Math.max(1, Math.min(5, n || 1));
  return "★".repeat(v);
}

export default async function RecruitingPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: {
    msg?: string;
    err?: string;
    q?: string;
    pos?: string;
    state?: string;
    arch?: string;
    minStars?: string;
  };
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const teamId = myMembership?.team_id || null;

  const { data: team } = teamId
    ? await supabase
        .from("teams")
        .select("id,name,conference_name,conference,prestige")
        .eq("id", teamId)
        .single()
    : { data: null as any };

  const { data: pipelines } = teamId
    ? await supabase
        .from("team_pipelines")
        .select("id,state,bonus")
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
        .order("state", { ascending: true })
    : { data: [] as any[] };

  const { data: board } = teamId
    ? await supabase
        .from("recruiting_board")
        .select("slot,recruit_id")
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
        .eq("user_id", userData.user.id)
        .order("slot", { ascending: true })
    : { data: [] as any[] };

  const boardIds = (board || []).map((b: any) => b.recruit_id);

  const { data: boardRecruits } =
    teamId && boardIds.length
      ? await supabase
          .from("recruits")
          .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,quality")
          .in("id", boardIds)
      : { data: [] as any[] };

  const recruitsById = new Map<string, any>();
  (boardRecruits || []).forEach((r: any) => recruitsById.set(r.id, r));

  const { data: visits } =
    teamId && boardIds.length
      ? await supabase
          .from("recruit_visits")
          .select("recruit_id,week,visit_type")
          .eq("league_id", params.leagueId)
          .eq("team_id", teamId)
      : { data: [] as any[] };

  const visitByRecruit = new Map<string, any>();
  (visits || []).forEach((v: any) => visitByRecruit.set(v.recruit_id, v));

  // Search
  const q = (searchParams?.q || "").trim();
  const pos = (searchParams?.pos || "").trim();
  const st = (searchParams?.state || "").trim().toUpperCase();
  const arch = (searchParams?.arch || "").trim();
  const minStars = Number(searchParams?.minStars || "0");

  let query = supabase
    .from("recruits")
    .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,quality", { count: "exact" })
    .eq("league_id", params.leagueId)
    .is("committed_team_id", null)
    .order("stars", { ascending: false })
    .order("rank", { ascending: true })
    .limit(50);

  if (q) query = query.ilike("name", `%${q}%`);
  if (pos) query = query.eq("position", pos);
  if (st) query = query.eq("state", st);
  if (arch) query = query.eq("archetype", arch);
  if (minStars > 0) query = query.gte("stars", minStars);

  const { data: searchResults, count } = await query;

  const usedSlots = new Set<number>((board || []).map((b: any) => b.slot));

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Recruiting — {league?.name}</div>
        <p className="muted">
          Season {league?.current_season} · Week {league?.current_week} ·
          {team ? ` Team: ${team.conference_name || team.conference || ""} ${team.name}` : " Pick a team in Team & Role to start."}
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        {!teamId ? (
          <p className="muted" style={{ marginTop: 8 }}>
            You must set your Team & Role first.{" "}
            <Link href={`/league/${params.leagueId}/team-role`} className="btn secondary">
              Team & Role
            </Link>
          </p>
        ) : null}
      </div>

      {/* Pipelines */}
      <div className="card col12">
        <div className="h2">Pipelines (max 3)</div>
        <p className="muted">Adds a small weekly bonus for recruits from those states.</p>

        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {(pipelines || []).map((p: any) => (
            <form key={p.id} action={removePipelineAction} className="row" style={{ gap: 8 }}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <input type="hidden" name="teamId" value={teamId ?? ""} />
              <input type="hidden" name="state" value={p.state} />
              <span className="badge">{p.state} (+{p.bonus})</span>
              <button className="btn secondary" type="submit">Remove</button>
            </form>
          ))}
          {(!pipelines || pipelines.length === 0) ? <span className="muted">No pipelines set.</span> : null}
        </div>

        {teamId ? (
          <form action={setPipelineAction} className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input type="hidden" name="leagueId" value={params.leagueId} />
            <input type="hidden" name="teamId" value={teamId} />
            <input className="input" name="state" placeholder="State (e.g., MD)" maxLength={2} />
            <input className="input" name="bonus" placeholder="Bonus (default 5)" defaultValue="5" />
            <button className="btn" type="submit">Add/Update</button>
          </form>
        ) : null}
      </div>

      {/* Top-8 */}
      <div className="card col12">
        <div className="h2">Your Top-8 Board</div>
        <p className="muted">You can only schedule visits for recruits on your Top-8.</p>

        {!teamId ? (
          <p className="muted">Pick a team first.</p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Recruit</th>
                <th>Pos</th>
                <th>Stars</th>
                <th>State</th>
                <th>Visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => {
                const slot = i + 1;
                const b = (board || []).find((x: any) => x.slot === slot);
                const r = b ? recruitsById.get(b.recruit_id) : null;
                const v = b ? visitByRecruit.get(b.recruit_id) : null;

                return (
                  <tr key={slot}>
                    <td>{slot}</td>
                    <td>{r ? r.name : <span className="muted">Empty</span>}</td>
                    <td>{r?.position || "—"}</td>
                    <td>{r ? stars(r.stars) : "—"}</td>
                    <td>{r?.state || "—"}</td>
                    <td>
                      {r ? (
                        <form action={scheduleVisitAction} className="row" style={{ gap: 8 }}>
                          <input type="hidden" name="leagueId" value={params.leagueId} />
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="recruitId" value={r.id} />
                          <input className="input" name="week" placeholder="Week" defaultValue={v?.week ?? ""} style={{ width: 90 }} />
                          <select className="input" name="visitType" defaultValue={v?.visit_type ?? "official"}>
                            <option value="unofficial">Unofficial</option>
                            <option value="official">Official</option>
                            <option value="game">Game</option>
                          </select>
                          <button className="btn secondary" type="submit">Save</button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r ? (
                        <form action={removeFromBoardAction}>
                          <input type="hidden" name="leagueId" value={params.leagueId} />
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="recruitId" value={r.id} />
                          <button className="btn secondary" type="submit">Remove</button>
                        </form>
                      ) : (
                        <span className="muted">—</span>
                      )}
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
        <p className="muted">Shows up to 50 uncommitted recruits (filterable). Found: {count ?? 0}</p>

        <form method="get" className="grid" style={{ gap: 12, marginTop: 12 }}>
          <div className="col12">
            <label className="label">Name</label>
            <input className="input" name="q" defaultValue={q} placeholder="Search name..." />
          </div>

          <div className="col12 row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="label">Position</label>
              <input className="input" name="pos" defaultValue={pos} placeholder="QB, RB, WR..." />
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="label">State</label>
              <input className="input" name="state" defaultValue={st} placeholder="MD" maxLength={2} />
            </div>
            <div style={{ minWidth: 180, flex: "1 1 180px" }}>
              <label className="label">Archetype</label>
              <input className="input" name="arch" defaultValue={arch} placeholder="Scrambler..." />
            </div>
            <div style={{ minWidth: 140, flex: "1 1 140px" }}>
              <label className="label">Min Stars</label>
              <input className="input" name="minStars" defaultValue={minStars ? String(minStars) : ""} placeholder="3" />
            </div>
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">Search</button>
            <Link className="btn secondary" href={`/league/${params.leagueId}`}>Back</Link>
          </div>
        </form>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pos</th>
              <th>Stars</th>
              <th>Rank</th>
              <th>State</th>
              <th>Archetype</th>
              <th>OVR</th>
              <th>Add to slot</th>
            </tr>
          </thead>
          <tbody>
            {(searchResults || []).map((r: any) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.position}</td>
                <td>{stars(r.stars)}</td>
                <td>{r.rank}</td>
                <td>{r.state}</td>
                <td>{r.archetype}</td>
                <td>{r.quality}</td>
                <td style={{ textAlign: "right" }}>
                  {!teamId ? (
                    <span className="muted">Pick team</span>
                  ) : (
                    <form action={addToBoardAction} className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="recruitId" value={r.id} />
                      <select className="input" name="slot" defaultValue="">
                        <option value="" disabled>
                          Slot…
                        </option>
                        {Array.from({ length: 8 }).map((_, i) => {
                          const slot = i + 1;
                          return (
                            <option key={slot} value={slot}>
                              {slot}{usedSlots.has(slot) ? " (replace)" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <button className="btn secondary" type="submit">Add</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(!searchResults || searchResults.length === 0) ? (
              <tr>
                <td className="muted" colSpan={8}>No recruits found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
