import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

const ROLES = [
  { id: "ad", label: "AD (Athletic Director)" },
  { id: "hc", label: "HC (Head Coach)" },
  { id: "oc", label: "OC (Offensive Coordinator)" },
  { id: "dc", label: "DC (Defensive Coordinator)" }
] as const;

type RoleId = (typeof ROLES)[number]["id"];

function normalizeRole(input: unknown): RoleId | "" {
  const v = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (v === "ad") return "ad";
  if (v === "hc") return "hc";
  if (v === "oc") return "oc";
  if (v === "dc") return "dc";

  if (v === "headcoach" || v === "coach") return "hc";
  if (v === "athleticdirector") return "ad";
  if (v === "offensivecoordinator") return "oc";
  if (v === "defensivecoordinator") return "dc";

  return "";
}

/** =========================
 *  Server Actions
 *  ========================= */

async function setTeamRoleAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/settings?err=${enc("Pick a team.")}`);
  if (!role) redirect(`/league/${leagueId}/settings?err=${enc("Pick a valid role (AD/HC/OC/DC).")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_team_role", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_role: role
  });

  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}/settings?msg=${enc("Team & role saved.")}`);
}

async function advanceWeekAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) redirect(`/`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("advance_week", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}?msg=${enc("Advanced one week.")}`);
}

async function deleteLeagueAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  const confirm = String(formData.get("confirm") || "").trim();

  if (!leagueId) redirect(`/`);
  if (confirm !== "DELETE") {
    redirect(`/league/${leagueId}/settings?err=${enc('Type "DELETE" to confirm league deletion.')}`);
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  // If you don't have this RPC yet, you'll get a clear error message.
  const { error } = await supabase.rpc("delete_league", { p_league_id: leagueId });
  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);

  redirect(`/?msg=${enc("League deleted.")}`);
}

/** =========================
 *  Page
 *  ========================= */

export default async function SettingsPage(props: {
  params: { leagueId: string };
  searchParams?: { err?: string; msg?: string };
}) {
  const { params, searchParams } = props;

  const supabase = supabaseServer();
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const userId = userData.user.id;

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id,invite_code,current_season,current_week")
    .eq("id", params.leagueId)
    .single();

  if (leagueErr || !league) {
    return (
      <div className="card">
        <div className="h1">Settings</div>
        <p className="error">Could not load league.</p>
        <p className="muted">{leagueErr?.message}</p>
        <Link className="btn secondary" href="/">
          Back
        </Link>
      </div>
    );
  }

  const isCommissioner = league.commissioner_id === userId;

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id,name,conference,conference_name")
    .eq("league_id", params.leagueId)
    .order("conference_name", { ascending: true })
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  if (teamsErr) {
    return (
      <div className="card">
        <div className="h1">Settings — {league.name}</div>
        <p className="error">Could not load teams.</p>
        <p className="muted">{teamsErr.message}</p>
        <Link className="btn secondary" href={`/league/${params.leagueId}`}>
          Back
        </Link>
      </div>
    );
  }

  // Optional availability (may be empty depending on RLS)
  const { data: leagueMemberships } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId);

  const takenByTeamRole = new Map<string, Set<string>>();
  (leagueMemberships || []).forEach((m: any) => {
    if (!m.team_id || !m.role) return;
    const key = String(m.team_id);
    if (!takenByTeamRole.has(key)) takenByTeamRole.set(key, new Set());
    takenByTeamRole.get(key)!.add(String(m.role).toLowerCase());
  });

  const currentRole = myMembership?.role ? String(myMembership.role).toUpperCase() : "—";
  const currentTeam = myMembership?.team_id
    ? (teams || []).find((t: any) => t.id === myMembership.team_id)
    : null;

  const defaultRole = (myMembership?.role ? String(myMembership.role) : "hc").toLowerCase();

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Settings — {league.name}</div>
        <p className="muted">
          Season {league.current_season} · Week {league.current_week}
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <Link className="btn secondary" href={`/league/${params.leagueId}`}>
            Back to League
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/roster`}>
            Roster
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/teams`}>
            Teams
          </Link>
        </div>
      </div>

      <div className="card col12">
        <div className="h2">Invite</div>
        <p className="muted">Share this code so friends can join your league:</p>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="pill" style={{ fontFamily: "monospace" }}>
            {league.invite_code}
          </div>
          <Link className="btn secondary" href={`/league/join`}>
            Join by Code
          </Link>
        </div>
      </div>

      <div className="card col12">
        <div className="h2">Team & Role</div>
        <p className="muted">
          Your current assignment:{" "}
          <strong>{currentTeam ? currentTeam.name : "—"}</strong> ·{" "}
          <strong>{currentRole}</strong>
        </p>

        <form action={setTeamRoleAction} className="grid" style={{ gap: 12, marginTop: 12 }}>
          <input type="hidden" name="leagueId" value={params.leagueId} />

          <div className="col12">
            <label className="label">Team</label>
            <select className="input" name="teamId" defaultValue={myMembership?.team_id ?? ""}>
              <option value="">— Choose team —</option>
              {(teams || []).map((t: any) => {
                const conf = t.conference_name || t.conference || "";
                const taken = takenByTeamRole.get(String(t.id)) || new Set<string>();
                const suffix =
                  taken.size > 0
                    ? ` (taken: ${Array.from(taken).map((x) => x.toUpperCase()).join(", ")})`
                    : "";
                return (
                  <option key={t.id} value={t.id}>
                    {(conf ? `${conf} — ` : "") + t.name + suffix}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="col12">
            <label className="label">Role</label>
            <select className="input" name="role" defaultValue={defaultRole}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">
              Save Team & Role
            </button>
          </div>

          <p className="muted" style={{ marginTop: 6 }}>
            Accepted roles: ad, hc, oc, dc. If you still see “Invalid role”, your DB RPC is still not the canonical one.
          </p>
        </form>
      </div>

      <div className="card col12">
        <div className="h2">League admin</div>
        {!isCommissioner ? (
          <p className="muted">Only the commissioner can advance weeks or delete the league.</p>
        ) : (
          <div className="grid" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <form action={advanceWeekAction}>
                <input type="hidden" name="leagueId" value={params.leagueId} />
                <button className="btn" type="submit">
                  Advance Week
                </button>
              </form>
            </div>

            <div className="card" style={{ borderStyle: "dashed" }}>
              <div className="h3">Delete league (danger)</div>
              <p className="muted">
                This cannot be undone. Type <strong>DELETE</strong> and click the button.
              </p>
              <form action={deleteLeagueAction} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <input type="hidden" name="leagueId" value={params.leagueId} />
                <input className="input" name="confirm" placeholder='Type "DELETE"' />
                <button className="btn danger" type="submit">
                  Delete League
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="card col12">
        <div className="h2">Roadmap toggles (coming soon)</div>
        <ul className="muted">
          <li>Recruiting board + weekly points</li>
          <li>Transfer portal + NIL offers</li>
          <li>Coach objectives + hot seat meter</li>
          <li>AI-generated news stories</li>
        </ul>
      </div>
    </div>
  );
}
