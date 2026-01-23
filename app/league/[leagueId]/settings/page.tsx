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

function normalizeRole(input: string) {
  const r = (input || "").trim().toLowerCase();
  if (r === "ad" || r === "hc" || r === "oc" || r === "dc") return r;
  return "";
}

/** =========================
 * Server Actions
 * ========================= */

async function setTeamRoleAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const roleRaw = String(formData.get("role") || "");

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/settings?err=${enc("Pick a team.")}`);

  const role = normalizeRole(roleRaw);
  if (!role) redirect(`/league/${leagueId}/settings?err=${enc("Pick a valid role (AD/HC/OC/DC).")}`);

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  // Try lowercase first (most common)
  let { error } = await supabase.rpc("set_team_role", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_role: role
  });

  // If your DB function is validating uppercase (HC/OC/DC/AD), retry with uppercase
  if (error && (error.message || "").toLowerCase().includes("invalid role")) {
    const retry = await supabase.rpc("set_team_role", {
      p_league_id: leagueId,
      p_team_id: teamId,
      p_role: role.toUpperCase()
    });
    error = retry.error;
  }

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

  redirect(`/league/${leagueId}?msg=${enc("Advanced to next week.")}`);
}

async function deleteLeagueAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  const confirm = String(formData.get("confirm") || "").trim().toUpperCase();

  if (!leagueId) redirect(`/`);
  if (confirm !== "DELETE") {
    redirect(`/league/${leagueId}/settings?err=${enc('Type DELETE to confirm league deletion.')}`);
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  // CHANGE THIS if your delete RPC is named differently.
  const { error } = await supabase.rpc("delete_league", { p_league_id: leagueId });

  if (error) redirect(`/league/${leagueId}/settings?err=${enc(error.message)}`);

  redirect(`/?msg=${enc("League deleted.")}`);
}

/** =========================
 * Page
 * ========================= */

export default async function SettingsPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: { err?: string; msg?: string };
}) {
  const supabase = supabaseServer();

  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?err=${enc("Please sign in first.")}`);
  }

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id,current_season,current_week")
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

  const isCommissioner = league.commissioner_id === userData.user.id;

  // Keep the membership query minimal to avoid schema mismatches.
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id,name,conference")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  if (teamsErr) {
    return (
      <div className="card">
        <div className="h1">Settings — {league.name}</div>
        <p className="error">Could not load teams.</p>
        <p className="muted">{teamsErr.message}</p>
        <Link className="btn secondary" href={`/league/${params.leagueId}`}>
          Back to League
        </Link>
      </div>
    );
  }

  const currentTeam =
    myMembership?.team_id && teams
      ? teams.find((t: any) => t.id === myMembership.team_id)
      : null;

  // If memberships.role is being used for team staff role, show it; otherwise show a dash.
  const rawRole = (myMembership?.role || "").toString();
  const displayRole =
    ["ad", "hc", "oc", "dc", "AD", "HC", "OC", "DC"].includes(rawRole)
      ? rawRole.toUpperCase()
      : "—";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Settings — {league.name}</div>
        <p className="muted">
          Season {league.current_season} · Week {league.current_week}
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn secondary" href={`/league/${params.leagueId}`}>
            Back to League
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/teams`}>
            Teams
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/schedule`}>
            Schedule
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/recruiting`}>
            Recruiting
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/portal`}>
            Portal
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/nil`}>
            NIL
          </Link>
          <Link className="btn secondary" href={`/league/${params.leagueId}/coaches`}>
            Coaches
          </Link>
        </div>
      </div>

      <div className="card col12">
        <div className="h2">Team & Role</div>
        <p className="muted">
          Current: <strong>{currentTeam ? currentTeam.name : "—"}</strong> · Role:{" "}
          <strong>{displayRole}</strong>
        </p>

        <form action={setTeamRoleAction} className="grid" style={{ gap: 12, marginTop: 12 }}>
          <input type="hidden" name="leagueId" value={params.leagueId} />

          <div className="col12">
            <label className="label">Team</label>
            <select className="input" name="teamId" defaultValue={myMembership?.team_id ?? ""}>
              <option value="">— Choose team —</option>
              {(teams || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {(t.conference ? `${t.conference} — ` : "") + t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col12">
            <label className="label">Role</label>
            <select
              className="input"
              name="role"
              defaultValue={normalizeRole(rawRole) || "hc"}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="muted" style={{ marginTop: 6 }}>
              If you still see “Invalid role”, it is coming from the database function
              <code style={{ marginLeft: 6 }}>set_team_role</code> validation rules, not this UI.
              This page already retries both lowercase and uppercase.
            </p>
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">
              Save Team & Role
            </button>
          </div>
        </form>
      </div>

      <div className="card col12">
        <div className="h2">League Admin</div>
        <p className="muted">
          Commissioner tools. If you are not the commissioner, these will be blocked by your database logic.
        </p>

        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          <div className="col12">
            <form action={advanceWeekAction} className="row" style={{ gap: 10, alignItems: "center" }}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <button className="btn" type="submit" disabled={!isCommissioner}>
                Advance Week
              </button>
              {!isCommissioner ? (
                <span className="muted">Only the commissioner can advance weeks.</span>
              ) : (
                <span className="muted">Simulates current week games and generates next week schedule.</span>
              )}
            </form>
          </div>

          <div className="col12">
            <div className="h3" style={{ marginTop: 6 }}>
              Delete League (danger)
            </div>
            <p className="muted">
              This cannot be undone. Type <strong>DELETE</strong> and submit.
            </p>

            <form action={deleteLeagueAction} className="row" style={{ gap: 10, alignItems: "center" }}>
              <input type="hidden" name="leagueId" value={params.leagueId} />
              <input
                className="input"
                name="confirm"
                placeholder="Type DELETE"
                style={{ maxWidth: 220 }}
              />
              <button className="btn danger" type="submit" disabled={!isCommissioner}>
                Delete League
              </button>
              {!isCommissioner ? (
                <span className="muted">Only the commissioner can delete the league.</span>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <div className="card col12">
        <div className="h2">Notes</div>
        <ul className="muted">
          <li>
            The Vercel error you posted was caused by passing event handlers (like{" "}
            <code>onSubmit</code>) across Server/Client component boundaries. This page avoids that entirely.
          </li>
          <li>
            “Invalid role” is almost certainly coming from your Postgres RPC validation. This page already
            normalizes the role and retries uppercase, which covers the most common mismatch.
          </li>
        </ul>
      </div>
    </div>
  );
}
