import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";
import {
  offerScholarshipAction,
  withdrawScholarshipAction,
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

  // Pipelines (v2: state + level)
  const { data: pipelines } = await supabase
    .from("team_pipelines")
    .select("state,level")
    .eq("league_id", params.leagueId)
    .eq("team_id", teamId)
    .order("level", { ascending: false })
    .order("state", { ascending: true });

  // Visits (this season)
  const { data: visits } = await supabase
    .from("recruit_visits")
    .select("recruit_id,week,visit_type")
    .eq("league_id", params.leagueId)
    .eq("team_id", teamId)
    .eq("season", season);

  const visitByRecruit = new Map<string, { week: number; visit_type: string }>();
  (visits || []).forEach((v: any) =>
    visitByRecruit.set(String(v.recruit_id), { week: Number(v.week), visit_type: String(v.visit_type || "official") })
  );

  // Filters
  const pos = (searchParams?.pos || "").trim().toUpperCase();
  const state = (searchParams?.state || "").trim().toUpperCase();
  const stars = (searchParams?.stars || "").trim();
  const archetype = (searchParams?.archetype || "").trim();
  const q = (searchParams?.q || "").trim();
  const qmin = Number((searchParams?.qmin || "").trim() || "");
  const qmax = Number((searchParams?.qmax || "").trim() || "");

  // Recruiting v2: fetch recruit list with Top-8 + Offer fields via RPC
  const { data: recruitList, error: recruitsErr } = await supabase.rpc("get_recruit_list_v1", {
    p_league_id: params.leagueId,
    p_team_id: teamId,
    p_limit: 200,
    p_offset: 0,
    p_only_uncommitted: true
  });

  const recruits: any[] = (recruitList as any)?.rows || [];
  const activeOffersCount: number = Number((recruitList as any)?.active_offers ?? 0);
  const offerCap: number = Number((recruitList as any)?.cap ?? 35);

  // Client-side filtering (RPC keeps the server logic simple)
  const filteredRecruits = (recruits || []).filter((r: any) => {
    const rPos = String(r.pos || r.position || "").toUpperCase();
    const rState = String(r.state || "").toUpperCase();
    const rStars = Number(r.stars || 0);
    const rArch = String(r.archetype || "");
    const rOvr = Number(r.ovr ?? r.quality ?? 0);
    const rName = String(r.name || "");

    if (pos && POSITIONS.includes(pos as any) && rPos !== pos) return false;
    if (state && state.length === 2 && rState !== state) return false;
    if (stars && rStars !== Number(stars)) return false;
    if (archetype && !rArch.toLowerCase().includes(archetype.toLowerCase())) return false;
    if (Number.isFinite(qmin) && qmin > 0 && rOvr < qmin) return false;
    if (Number.isFinite(qmax) && qmax > 0 && rOvr > qmax) return false;
    if (q && !rName.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // My offers table: fetch ALL active offers for this team/season (not just the first 200 recruits)
  const { data: myOfferRows } = await supabase
    .from("recruiting_offers")
    .select("recruit_id,points")
    .eq("league_id", params.leagueId)
    .eq("season", season)
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("points", { ascending: false })
    .limit(300);

  const myOfferIds = (myOfferRows || []).map((o: any) => String(o.recruit_id));
  const { data: myOfferRecruits } = myOfferIds.length
    ? await supabase
        .from("recruits")
        .select("id,name,position,stars,state,archetype,quality,rank")
        .in("id", myOfferIds)
    : { data: [] as any[] };

  const recruitById = new Map<string, any>();
  (myOfferRecruits || []).forEach((r: any) => recruitById.set(String(r.id), r));

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
              My Offers (Active <strong>{activeOffersCount}</strong>/{offerCap})
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              Pipelines:{" "}
              {(pipelines || []).length
                ? (pipelines || [])
                    .map((p: any) => `${p.state} (Lv ${p.level})`)
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
            Showing {filteredRecruits.length} recruit(s) (server sorted by Stars → OVR → Rank; filters applied client-side).
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
            {(filteredRecruits || []).map((r: any) => {
              const rid = String(r.id);
              const offer = r.offer;
              const top8 = Array.isArray(r.top8) ? r.top8 : [];
              const visit = visitByRecruit.get(rid);

              const starsText = "★★★★★".slice(0, Math.max(1, Math.min(5, Number(r.stars || 1))));

              return (
                <tr key={rid}>
                  <td>{r.name}</td>
                  <td>{r.pos || r.position}</td>
                  <td>{starsText}</td>
                  <td>{r.rank ?? "—"}</td>
                  <td>{r.state}</td>
                  <td>{r.archetype}</td>
                  <td>{r.ovr ?? r.quality}</td>

                  <td>
                    {top8.length ? (
                      <div className="muted" style={{ maxWidth: 340 }}>
                        {top8.map((t: any, i: number) => (
                          <span key={`${rid}-${i}`}>
                            {i ? " · " : ""}
                            {t.team_name || t.team_id} ({t.points})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td>
                    {offer?.is_active ? (
                      <form action={withdrawScholarshipAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <span className="muted">Offered ({offer.points})</span>
                        <button className="btn secondary" type="submit">Withdraw</button>
                      </form>
                    ) : (
                      <form action={offerScholarshipAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <input type="hidden" name="leagueId" value={params.leagueId} />
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="recruitId" value={rid} />
                        <button className="btn" type="submit">Offer</button>
                      </form>
                    )}
                  </td>

                  <td>
                    <form action={scheduleRecruitVisitAction} className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="recruitId" value={rid} />
                      <select className="input" name="week" defaultValue={visit ? String(visit.week) : "5"} style={{ width: 100 }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            W{i + 1}
                          </option>
                        ))}
                      </select>
                      <select className="input" name="visitType" defaultValue={visit ? String(visit.visit_type) : "official"} style={{ width: 130 }}>
                        <option value="official">Official</option>
                        <option value="unofficial">Unofficial</option>
                      </select>
                      <button className="btn secondary" type="submit">
                        {visit ? "Change" : "Set"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}

            {(!filteredRecruits || filteredRecruits.length === 0) ? (
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
        <div className="h2">My Offers (Active {activeOffersCount}/{offerCap})</div>
        <p className="muted" style={{ marginTop: 6 }}>
          This list is pulled from <code>recruiting_offers</code> for your team (not limited to the first 200 recruits).
        </p>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Recruit</th>
              <th>Pos</th>
              <th>Stars</th>
              <th>State</th>
              <th>OVR</th>
              <th>Points</th>
              <th>Visit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(myOfferRows || []).map((o: any) => {
              const rid = String(o.recruit_id);
              const r = recruitById.get(rid);
              const visit = visitByRecruit.get(rid);
              const starsText = r ? "★★★★★".slice(0, Math.max(1, Math.min(5, Number(r.stars || 1)))) : "—";

              return (
                <tr key={rid}>
                  <td>{r?.name || rid}</td>
                  <td>{r?.position || "—"}</td>
                  <td>{starsText}</td>
                  <td>{r?.state || "—"}</td>
                  <td>{r?.quality ?? "—"}</td>
                  <td>{o.points ?? 0}</td>
                  <td>{visit ? `W${visit.week} (${visit.visit_type})` : "—"}</td>
                  <td>
                    <form action={withdrawScholarshipAction}>
                      <input type="hidden" name="leagueId" value={params.leagueId} />
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="recruitId" value={rid} />
                      <button className="btn secondary" type="submit">Withdraw</button>
                    </form>
                  </td>
                </tr>
              );
            })}

            {(!myOfferRows || myOfferRows.length === 0) ? (
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
