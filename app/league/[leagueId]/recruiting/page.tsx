import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

const VISIT_TYPES = [
  { id: "unofficial", label: "Unofficial" },
  { id: "official", label: "Official" },
  { id: "game", label: "Game Day" }
] as const;

async function addToBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const slot = Number(String(formData.get("slot") || "0"));

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first (Settings → Team & Role).")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);
  if (!slot || slot < 1 || slot > 8) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a slot 1–8.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("add_to_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_slot: slot
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Added to Top-8 board.")}`);
}

async function removeFromBoardAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_from_board", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Removed from board.")}`);
}

async function scheduleVisitAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  const week = Number(String(formData.get("week") || "0"));
  const visitType = String(formData.get("visitType") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);
  if (!week) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a week.")}`);
  if (!visitType) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a visit type.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("schedule_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId,
    p_week: week,
    p_visit_type: visitType
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Visit scheduled.")}`);
}

async function clearVisitAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const recruitId = String(formData.get("recruitId") || "").trim();
  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!recruitId) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing recruit id.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("clear_visit", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_recruit_id: recruitId
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Visit cleared.")}`);
}

async function addPipelineAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("Enter a state code (e.g., MD).")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_pipeline_state", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_state: state,
    p_bonus: 5
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Pipeline saved.")}`);
}

async function removePipelineAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const state = String(formData.get("state") || "").trim();

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/recruiting?err=${enc("Pick a team first.")}`);
  if (!state) redirect(`/league/${leagueId}/recruiting?err=${enc("Missing state.")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("remove_pipeline_state", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_state: state
  });

  if (error) redirect(`/league/${leagueId}/recruiting?err=${enc(error.message)}`);
  redirect(`/league/${leagueId}/recruiting?msg=${enc("Pipeline removed.")}`);
}

function starsText(n: number) {
  const s = Math.max(1, Math.min(5, n || 1));
  return "★".repeat(s);
}

export default async function RecruitingPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: {
    msg?: string;
    err?: string;
    pos?: string;
    state?: string;
    stars?: string;
    qmin?: string;
    qmax?: string;
    team?: string;
  };
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,current_week,current_season")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const teamId = (searchParams?.team || myMembership?.team_id || "").toString();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,conference")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  const selectedTeam = teamId ? (teams || []).find((t: any) => t.id === teamId) : null;

  // Pipelines
  const { data: pipelines } = teamId
    ? await supabase
        .from("team_pipelines")
        .select("id,state,bonus")
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
        .order("state", { ascending: true })
    : { data: [] as any[] };

  // Board (Top-8)
  const { data: boardRows } = teamId
    ? await supabase
        .from("recruiting_board")
        .select("slot,recruit_id")
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
        .eq("user_id", userData.user.id)
        .order("slot", { ascending: true })
    : { data: [] as any[] };

  const boardIds = new Set((boardRows || []).map((b: any) => b.recruit_id));

  // Pull recruit details for board
  const boardRecruitIds = (boardRows || []).map((b: any) => b.recruit_id);
  const { data: boardRecruits } =
    teamId && boardRecruitIds.length
      ? await supabase
          .from("recruits")
          .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,quality")
          .eq("league_id", params.leagueId)
          .in("id", boardRecruitIds)
      : { data: [] as any[] };

  const boardRecruitMap = new Map((boardRecruits || []).map((r: any) => [r.id, r]));

  // Visits for team
  const { data: visits } = teamId
    ? await supabase
        .from("recruit_visits")
        .select("recruit_id,week,visit_type")
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
    : { data: [] as any[] };

  const visitMap = new Map((visits || []).map((v: any) => [v.recruit_id, v]));

  // Recruit search filters
  const pos = (searchParams?.pos || "").trim();
  const state = (searchParams?.state || "").trim().toUpperCase();
  const stars = Number(searchParams?.stars || "0");
  const qmin = Number(searchParams?.qmin || "0");
  const qmax = Number(searchParams?.qmax || "0");

  let recruitsQuery = supabase
    .from("recruits")
    .select("id,name,position,stars,rank,state,height_in,weight_lb,archetype,quality")
    .eq("league_id", params.leagueId)
    .order("rank", { ascending: true })
    .limit(100);

  if (pos) recruitsQuery = recruitsQuery.eq("position", pos);
  if (state) recruitsQuery = recruitsQuery.eq("state", state);
  if (stars >= 1 && stars <= 5) recruitsQuery = recruitsQuery.eq("stars", stars);
  if (qmin > 0) recruitsQuery = recruitsQuery.gte("quality", qmin);
  if (qmax > 0) recruitsQuery = recruitsQuery.lte("quality", qmax);

  const { data: recruits } = await recruitsQuery;

  const weekNow = Number(league?.current_week || 1);
  const weekOptions = Array.from({ length: 10 }, (_, i) => i + weekNow).filter((w) => w >= 1 && w <= 20);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Recruiting — {league?.name}</div>
        <p className="muted">
          Top-8 board + pipelines + visits (v1). Season {league?.current_season} · Week {league?.current_week}
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn secondary" href={`/league/${params.leagueId}`}>
            Back to League
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/settings`}>
            Settings
          </Link>
        </div>
      </div>

      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div className="h2">Team Context</div>
            <p className="muted">
              Selected team is required for board/pipelines/visits.
            </p>
          </div>

          <form method="get" className="row" style={{ gap: 8 }}>
            <select className="input" name="team" defaultValue={teamId || ""}>
              <option value="">— Choose team —</option>
              {(teams || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {(t.conference ? `${t.conference} — ` : "") + t.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Use Team
            </button>
          </form>
        </div>

        {!teamId ? (
          <p className="muted" style={{ marginTop: 10 }}>
            No team selected. Go to <Link href={`/league/${params.leagueId}/settings`}>Settings</Link> to pick a team & role, or select one above.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 10 }}>
            Active team: <strong>{selectedTeam ? selectedTeam.name : teamId}</strong>
          </p>
        )}
      </div>

      {/* Left: Board + Pipelines */}
      <div className="card col6">
        <div className="h2">Your Top-8 Board</div>
        <p className="muted">Slots 1–8. Add recruits from the search list.</p>

        {!teamId ? (
          <p className="muted">Pick a team to use the board.</p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Recruit</th>
                <th>Visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((slot) => {
                const row = (boardRows || []).find((b: any) => b.slot === slot);
                const rec = row ? boardRecruitMap.get(row.recruit_id) : null;
                const visit = row ? visitMap.get(row.recruit_id) : null;

                return (
                  <tr key={slot}>
                    <td>#{slot}</td>
                    <td>
                      {rec ? (
                        <div>
                          <div>
                            <strong>{rec.name}</strong> · {rec.position} · {starsText(rec.stars)} · Q{rec.quality}
                          </div>
                          <div className="muted">
                            {rec.state} · {Math.floor(rec.height_in / 12)}'{rec.height_in % 12}" / {rec.weight_lb} · {rec.archetype}
                          </div>
                        </div>
                      ) : (
                        <span className="muted">Empty</span>
                      )}
                    </td>
                    <td>
                      {!rec ? (
                        <span className="muted">—</span>
                      ) : visit ? (
                        <div>
                          <div>
                            <strong>W{visit.week}</strong> · {String(visit.visit_type).toUpperCase()}
                          </div>
                          <form action={clearVisitAction} className="row" style={{ gap: 8, marginTop: 6 }}>
                            <input type="hidden" name="leagueId" value={params.leagueId} />
                            <input type="hidden" name="teamId" value={teamId} />
                            <input type="hidden" name="recruitId" value={rec.id} />
                            <button className="btn secondary" type="submit">
                              Clear
                            </button>
                          </form>
                        </div>
                      ) : (
                        <form action={scheduleVisitAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                          <input type="hidden" name="leagueId" value={params.leagueId} />
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="recruitId" value={rec.id} />
                          <select className="input" name="week" defaultValue={String(weekNow)}>
                            {weekOptions.map((w) => (
                              <option key={w} value={w}>
                                Week {w}
                              </option>
                            ))}
                          </select>
                          <select className="input" name="visitType" defaultValue="official">
                            {VISIT_TYPES.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <button className="btn" type="submit">
                            Schedule
                          </button>
                        </form>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {rec ? (
                        <form action={removeFromBoardAction}>
                          <input type="hidden" name="leagueId" value={params.leagueId} />
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="recruitId" value={rec.id} />
                          <button className="btn danger" type="submit">
                            Remove
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="h2" style={{ marginTop: 18 }}>
          Pipelines (max 3)
        </div>
        <p className="muted">Pipelines will later give weekly recruiting bonuses for in-state recruits.</p>

        {!teamId ? (
          <p className="muted">Pick a team to manage pipelines.</p>
        ) : (
          <>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {(pipelines || []).map((p: any) => (
                <form key={p.id} action={removePipelineAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="leagueId" value={params.leagueId} />
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="state" value={p.state} />
                  <span className="muted">
                    <strong>{p.state}</strong> (+{p.bonus})
                  </span>
                  <button className="btn secondary" type="submit">
                    Remove
                  </button>
                </form>
              ))}
              {(!pipelines || pipelines.length === 0) ? <span className="muted">No pipelines yet.</span> : null}
            </div>

            <form action={addPipelineAction} className="row" style={{ gap: 8, marginTop: 10, alignItems: "center" }}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <input type="hidden" name="teamId" value={teamId} />
              <input className="input" name="state" placeholder="State (e.g., MD)" style={{ maxWidth: 160 }} />
              <button className="btn" type="submit">
                Add Pipeline
              </button>
            </form>
          </>
        )}
      </div>

      {/* Right: Search & Add */}
      <div className="card col6">
        <div className="h2">Recruit Search</div>
        <p className="muted">
          Filter and add recruits to your Top-8 board. This list is limited to 100 results.
        </p>

        <form method="get" className="grid" style={{ gap: 10, marginTop: 12 }}>
          <input type="hidden" name="team" value={teamId} />
          <div className="col12 row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="input" name="pos" placeholder="Position (QB/RB/WR/...)" defaultValue={pos} />
            <input className="input" name="state" placeholder="State (MD/PA/...)" defaultValue={state} />
            <input className="input" name="stars" placeholder="Stars (1-5)" defaultValue={stars ? String(stars) : ""} />
          </div>
          <div className="col12 row" style={{ gap: 8 }}>
            <input className="input" name="qmin" placeholder="Min Quality" defaultValue={qmin ? String(qmin) : ""} />
            <input className="input" name="qmax" placeholder="Max Quality" defaultValue={qmax ? String(qmax) : ""} />
            <button className="btn" type="submit">
              Apply Filters
            </button>
          </div>
        </form>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Recruit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(recruits || []).map((r: any) => {
              const onBoard = boardIds.has(r.id);
              return (
                <tr key={r.id}>
                  <td>#{r.rank}</td>
                  <td>
                    <div>
                      <strong>{r.name}</strong> · {r.position} · {starsText(r.stars)} · Q{r.quality}
                    </div>
                    <div className="muted">
                      {r.state} · {Math.floor(r.height_in / 12)}'{r.height_in % 12}" / {r.weight_lb} · {r.archetype}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {!teamId ? (
                      <span className="muted">Pick team</span>
                    ) : onBoard ? (
                      <span className="muted">On board</span>
                    ) : (
                      <form action={addToBoardAction} className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="recruitId" value={r.id} />
                        <select className="input" name="slot" defaultValue="1">
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                            <option key={s} value={s}>
                              Slot {s}
                            </option>
                          ))}
                        </select>
                        <button className="btn" type="submit">
                          Add
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!recruits || recruits.length === 0) ? (
              <tr>
                <td className="muted" colSpan={3}>
                  No recruits found for current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
