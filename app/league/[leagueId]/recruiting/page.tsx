import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";
import {
  offerScholarshipAction,
  withdrawScholarshipAction,
  setRecruitingBoardSlotAction,
  removeRecruitFromBoardAction,
  scheduleRecruitVisitAction
} from "../../../actions";

function enc(s: string) {
  return encodeURIComponent(s ?? "");
}

const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"] as const;

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
    archetype?: string;
    qmin?: string;
    qmax?: string;
    q?: string;
  };
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?err=${enc("Please sign in first.")}`);
  }

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,name,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  if (leagueErr || !league) {
    return (
      <div className="card">
        <div className="h1">Recruiting</div>
        <p className="error">Could not load league.</p>
        <p className="muted">{leagueErr?.message}</p>
      </div>
    );
  }

  // Must have a team assignment to use recruiting
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!myMembership?.team_id) {
    redirect(`/league/${params.leagueId}/team-role?err=${enc("Pick a team and role to use Recruiting.")}`);
  }

  const teamId = myMembership.team_id;
  const season = league.current_season ?? 1;

  const { data: team } = await supabase
    .from("teams")
    .select("id,name,conference_name,conference,prestige")
    .eq("id", teamId)
    .single();

  // Pipelines
  const { data: pipelines } = await supabase
    .from("team_pipelines")
    .select("slot,state")
    .eq("team_id", teamId)
    .order("slot", { ascending: true });

  // Top-8 board
  const { data: board } = await supabase
    .from("recruiting_board")
    .select("slot,recruit_id")
    .eq("team_id", teamId)
    .order("slot", { ascending: true });

  const boardByRecruit = new Map<string, number>();
  (board || []).forEach((b: any) => boardByRecruit.set(String(b.recruit_id), Number(b.slot)));

  // Visits (this season)
  const { data: visits } = await supabase
    .from("recruit_visits")
    .select("recruit_id,week")
    .eq("team_id", teamId)
    .eq("season", season);

  const visitByRecruit = new Map<string, number>();
  (visits || []).forEach((v: any) => visitByRecruit.set(String(v.recruit_id), Number(v.week)));

  // Offers (this season)
  const { data: offers } = await supabase
    .from("recruiting_offers")
    .select("recruit_id,status,points")
    .eq("team_id", teamId)
    .eq("season", season);

  const offerByRecruit = new Map<string, any>();
  (offers || []).forEach((o: any) => offerByRecruit.set(String(o.recruit_id), o));

  const activeOffersCount =
    (offers || []).filter((o: any) => String(o.status) === "offered").length;

  // Filters
  const pos = (searchParams?.pos || "").trim().toUpperCase();
  const state = (searchParams?.state || "").trim().toUpperCase();
  const stars = (searchParams?.stars || "").trim();
  const archetype = (searchParams?.archetype || "").trim();
  const q = (searchParams?.q || "").trim();
  const qmin = Number((searchParams?.qmin || "").trim() || "");
  const qmax = Number((searchParams?.qmax || "").trim() || "");

  let recruitsQuery = supabase
    .from("recruits")
    .select("id,name,position,stars,rank,state,archetype,quality")
    .eq("league_id", params.leagueId);

  if (pos && POSITIONS.includes(pos as any)) recruitsQuery = recruitsQuery.eq("position", pos);
  if (state && state.length === 2) recruitsQuery = recruitsQuery.eq("state", state);
  if (stars) recruitsQuery = recruitsQuery.eq("stars", Number(stars));
  if (archetype) recruitsQuery = recruitsQuery.ilike("archetype", `%${archetype}%`);
  if (Number.isFinite(qmin)) recruitsQuery = recruitsQuery.gte("quality", qmin);
  if (Number.isFinite(qmax)) recruitsQuery = recruitsQuery.lte("quality", qmax);
  if (q) recruitsQuery = recruitsQuery.ilike("name", `%${q}%`);

  const { data: recruits, error: recruitsErr } = await recruitsQuery
    .order("stars", { ascending: false })
    .order("quality", { ascending: false })
    .order("rank", { ascending: true })
    .limit(200);

  return (
    <div className="grid">
      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="h1">Recruiting — {league.name}</div>
            <p className="muted" style={{ marginTop: 6 }}>
              Team: <strong>{team?.name}</strong>
              {" · "}
              Season: <strong>{season}</strong>
              {" · "}
              Week: <strong>{league.current_week}</strong>
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn secondary" href={`/league/${params.leagueId}`}>Back</Link>
          </div>
        </div>

        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="h2">Your recruiting state</div>
            <p className="muted" style={{ marginTop: 6 }}>
              Active offers: <strong>{activeOffersCount}</strong> / 35
              {" · "}
              Top-8 filled: <strong>{(board || []).length}</strong> / 8
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              Pipelines:{" "}
              {(pipelines || []).length
                ? (pipelines || [])
                    .map((p: any) => `${p.slot}: ${p.state}`)
                    .join(" · ")
                : "Not set yet (optional v1)."}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn secondary" href={`/league/${params.leagueId}/team-role`}>
              Team & Role
            </Link>
          </div>
        </div>
      </div>

      <div className="card col12">
        <div className="h2">Filters</div>
        <form method="get" className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <select className="input" name="pos" defaultValue={pos}>
            <option value="">Pos (All)</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <input className="input" name="state" placeholder="State (e.g., PA)" defaultValue={state} style={{ width: 140 }} />

          <select className="input" name="stars" defaultValue={stars} style={{ width: 160 }}>
            <option value="">Stars (All)</option>
            <option value="5">5★</option>
            <option value="4">4★</option>
            <option value="3">3★</option>
            <option value="2">2★</option>
            <option value="1">1★</option>
          </select>

          <input className="input" name="archetype" placeholder="Archetype" defaultValue={archetype} style={{ width: 180 }} />
          <input className="input" name="q" placeholder="Search name" defaultValue={q} style={{ width: 200 }} />

          <input className="input" name="qmin" placeholder="OVR min" defaultValue={searchParams?.qmin || ""} style={{ width: 120 }} />
          <input className="input" name="qmax" placeholder="OVR max" defaultValue={searchParams?.qmax || ""} style={{ width: 120 }} />

          <button className="btn" type="submit">Apply</button>
          <Link className="btn secondary" href={`/league/${params.leagueId}/recruiting`}>Reset</Link>
        </form>

        {recruitsErr ? (
          <p className="error" style={{ marginTop: 10 }}>{recruitsErr.message}</p>
        ) : (
          <p className="muted" style={{ marginTop: 10 }}>
            Showing up to 200 recruits (sorted by Stars → OVR → Rank).
          </p>
        )}
      </div>

      <div className="card col12">
        <div className="h2">Recruit List</div>

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
              <th>Top-8</th>
              <th>Offer</th>
              <th>Visit</th>
            </tr>
          </thead>
          <tbody>
            {(recruits || []).map((r: any) => {
              const rid = String(r.id);
              const onBoardSlot = boardByRecruit.get(rid);
              const offer = offerByRecruit.get(rid);
              const visitWeek = visitByRecruit.get(rid);

              const starsText = "★★★★★".slice(0, Math.max(1, Math.min(5, Number(r.stars || 1))));

              return (
                <tr key={rid}>
                  <td>{r.name}</td>
                  <td>{r.position}</td>
                  <td>{starsText}</td>
                  <td>{r.rank ?? "—"}</td>
                  <td>{r.state}</td>
                  <td>{r.archetype}</td>
                  <td>{r.quality}</td>

                  <td>
                    {onBoardSlot ? (
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <span className="muted">Slot {onBoardSlot}</span>
                        <form action={removeRecruitFromBoardAction}>
                          <input type="hidden" name="leagueId" value={params.leagueId} />
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="recruitId" value={rid} />
                          <button className="btn secondary" type="submit">Remove</button>
                        </form>
                      </div>
                    ) : (
                      <form action={setRecruitingBoardSlotAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <select className="input" name="slot" defaultValue="1" style={{ width: 110 }}>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Slot {i + 1}
                            </option>
                          ))}
                        </select>
                        <button className="btn" type="submit">Add</button>
                      </form>
                    )}
                  </td>

                  <td>
                    {offer?.status === "offered" ? (
                      <form action={withdrawScholarshipAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="season" value={season} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <span className="muted">Offered</span>
                        <button className="btn secondary" type="submit">Withdraw</button>
                      </form>
                    ) : (
                      <form action={offerScholarshipAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="season" value={season} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <button className="btn" type="submit">Offer</button>
                      </form>
                    )}
                  </td>

                  <td>
                    <form action={scheduleRecruitVisitAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="season" value={season} />
                      <input type="hidden" name="recruitId" value={rid} />
                      <select className="input" name="week" defaultValue={visitWeek ? String(visitWeek) : "5"} style={{ width: 100 }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            W{i + 1}
                          </option>
                        ))}
                      </select>
                      <button className="btn secondary" type="submit">
                        {visitWeek ? "Change" : "Set"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}

            {(!recruits || recruits.length === 0) ? (
              <tr>
                <td colSpan={10} className="muted">
                  No recruits found. If this is a brand-new league, confirm recruits were seeded for this league_id.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="muted" style={{ marginTop: 10 }}>
          Note: The 35-offer cap is enforced server-side in SQL. If you hit 35, the “Offer” action will return a clear error.
        </p>
      </div>

      <div className="card col12">
        <div className="h2">Your Offers (Season {season})</div>
        <p className="muted" style={{ marginTop: 6 }}>
          Active offers: <strong>{activeOffersCount}</strong> / 35
        </p>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Recruit</th>
              <th>Pos</th>
              <th>Stars</th>
              <th>State</th>
              <th>OVR</th>
              <th>Visit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(offers || [])
              .filter((o: any) => String(o.status) === "offered")
              .slice(0, 200)
              .map((o: any) => {
                const rid = String(o.recruit_id);
                const r = (recruits || []).find((x: any) => String(x.id) === rid);
                const visitWeek = visitByRecruit.get(rid);

                return (
                  <tr key={rid}>
                    <td>Offered</td>
                    <td>{r?.name || rid}</td>
                    <td>{r?.position || "—"}</td>
                    <td>{r ? "★★★★★".slice(0, Math.max(1, Math.min(5, Number(r.stars || 1)))) : "—"}</td>
                    <td>{r?.state || "—"}</td>
                    <td>{r?.quality ?? "—"}</td>
                    <td>{visitWeek ? `Week ${visitWeek}` : "—"}</td>
                    <td>
                      <form action={withdrawScholarshipAction}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="season" value={season} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <button className="btn secondary" type="submit">Withdraw</button>
                      </form>
                    </td>
                  </tr>
                );
              })}

            {activeOffersCount === 0 ? (
              <tr>
                <td colSpan={8} className="muted">No active offers yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
