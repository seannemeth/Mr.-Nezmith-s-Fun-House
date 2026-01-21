
import { supabaseServer } from "../../../../lib/supabaseServer";
import { setTeamRoleAction } from "../../../actions";

const ROLE_OPTIONS = [
  { value: "ad", label: "Athletic Director (AD)" },
  { value: "hc", label: "Head Coach (HC)" },
  { value: "oc", label: "Offensive Coordinator (OC)" },
  { value: "dc", label: "Defensive Coordinator (DC)" },
  { value: "member", label: "Member (spectator)" }
];

export default async function SettingsPage({
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
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Settings</div>
        <p className="muted">Please sign in.</p>
      </div>
    );
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name,commissioner_id,invite_code")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role, team_id")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,conference")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  // Which teams are already taken?
  const { data: taken } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", params.leagueId);

  const takenSet = new Set((taken ?? []).map((r: any) => r.team_id).filter(Boolean));

  const isCommissioner = league?.commissioner_id === userData.user.id;

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Settings — {league?.name}</div>
        <p className="muted">Invite code: <b>{league?.invite_code}</b></p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col6">
        <div className="h2">Pick Team & Role</div>
        <p className="muted">
          Choose a team to control. A team can be claimed by only one user. Roles affect your permissions later (recruiting, NIL, coaching upgrades).
        </p>

        <form action={setTeamRoleAction}>
          <input type="hidden" name="leagueId" value={params.leagueId} />

          <label className="muted">Role</label>
          <select className="input" name="role" defaultValue={myMembership?.role ?? "hc"}>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <div style={{ height: 10 }} />

          <label className="muted">Team</label>
          <select className="input" name="teamId" defaultValue={myMembership?.team_id ?? ""}>
            <option value="">No team (spectator)</option>
            {(teams ?? []).map((t: any) => {
              const takenByOther = takenSet.has(t.id) && t.id !== myMembership?.team_id;
              return (
                <option key={t.id} value={t.id} disabled={takenByOther}>
                  {t.conference} — {t.name}{takenByOther ? " (taken)" : ""}
                </option>
              );
            })}
          </select>

          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Save</button>
        </form>
      </div>

      <div className="card col6">
        <div className="h2">League Controls</div>
        <p className="muted">
          Commissioner-only actions will expand here (invite reset, rules, schedule options).
        </p>
        {isCommissioner ? (
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Advance Week from Dashboard</li>
            <li>Initialize Recruiting/Portal/NIL from Dashboard</li>
            <li>Delete league from Home</li>
          </ul>
        ) : (
          <p className="muted">You are not the commissioner for this league.</p>
        )}
      </div>
    </div>
  );
}
