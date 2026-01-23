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

async function setTeamRoleAction(formData: FormData) {
  "use server";

  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();

  // STEP 1: normalize role to a safe value like "hc"
  const role = String(formData.get("role") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "") as RoleId | string;

  if (!leagueId) redirect(`/`);
  if (!teamId) redirect(`/league/${leagueId}/team-role?err=${enc("Pick a team.")}`);
  if (!role) redirect(`/league/${leagueId}/team-role?err=${enc("Pick a role.")}`);

  // optional: hard-gate unknown roles before RPC
  if (!["ad", "hc", "oc", "dc"].includes(role)) {
    redirect(`/league/${leagueId}/team-role?err=${enc("Invalid role (client).")}`);
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  const { error } = await supabase.rpc("set_team_role", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_role: role
  });

  if (error) redirect(`/league/${leagueId}/team-role?err=${enc(error.message)}`);

  redirect(`/league/${leagueId}?msg=${enc("Team & role saved.")}`);
}

export default async function TeamRolePage(props: {
  params: { leagueId: string };
  searchParams?: { err?: string; msg?: string };
}) {
  const { params, searchParams } = props;

  const supabase = supabaseServer();

  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?err=${enc("Please sign in first.")}`);
  }

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id")
    .eq("id", params.leagueId)
    .single();

  if (leagueErr || !league) {
    return (
      <div className="card">
        <div className="h1">Team & Role</div>
        <p className="error">Could not load league.</p>
        <p className="muted">{leagueErr?.message}</p>
        <Link className="btn secondary" href="/">
          Back
        </Link>
      </div>
    );
  }

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  // NOTE: your schema shows teams has conference + conference_name (sometimes missing in old leagues)
  // So we order by what exists, but do not assume either exists.
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
        <div className="h1">Team & Role — {league.name}</div>
        <p className="error">Could not load teams.</p>
        <p className="muted">{teamsErr.message}</p>
        <Link className="btn secondary" href={`/league/${params.leagueId}`}>
          Back
        </Link>
      </div>
    );
  }

  const currentRole = myMembership?.role ? String(myMembership.role).toUpperCase() : "—";
  const currentTeam = myMembership?.team_id
    ? (teams || []).find((t: any) => t.id === myMembership.team_id)
    : null;

  const defaultRole = (myMembership?.role ? String(myMembership.role) : "hc").toLowerCase();

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Team & Role — {league.name}</div>
        <p className="muted">
          Pick one team and one role. Each team can have 1 AD, 1 HC, 1 OC, and 1 DC.
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col12">
        <div className="h2">Your current assignment</div>
        <p className="muted">
          Team: <strong>{currentTeam ? currentTeam.name : "—"}</strong>
          {" · "}
          Role: <strong>{currentRole}</strong>
        </p>

        <form action={setTeamRoleAction} className="grid" style={{ gap: 12, marginTop: 12 }}>
          <input type="hidden" name="leagueId" value={params.leagueId} />

          <div className="col12">
            <label className="label">Team</label>
            <select className="input" name="teamId" defaultValue={myMembership?.team_id ?? ""}>
              <option value="">— Choose team —</option>
              {(teams || []).map((t: any) => {
                const conf = t.conference_name || t.conference || "";
                return (
                  <option key={t.id} value={t.id}>
                    {(conf ? `${conf} — ` : "") + t.name}
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
            <p className="muted" style={{ marginTop: 6 }}>
              If a role is already taken for that team, you’ll get a clear error and can choose another.
            </p>
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">
              Save Team & Role
            </button>
            <Link className="btn secondary" href={`/league/${params.leagueId}`}>
              Back
            </Link>
          </div>
        </form>
      </div>

      <div className="card col12">
        <div className="h2">Recommended flow</div>
        <ul className="muted">
          <li>HC: sets depth chart, recruiting board, weekly strategy.</li>
          <li>OC/DC: specialize recruiting + weekly tactics (we’ll gate features by role).</li>
          <li>AD: budgets, facilities, NIL emphasis (we’ll add budgets next).</li>
        </ul>
      </div>
    </div>
  );
}
