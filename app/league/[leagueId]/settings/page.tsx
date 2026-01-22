import { supabaseServer } from "../../../../lib/supabaseServer";
import { selectRoleAction } from "../../../actions";

const ROLES = ["AD","Head Coach","Offensive Coordinator","Defensive Coordinator","Recruiting Director"];

export default async function LeagueSettingsPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams?: { err?: string; ok?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const ok = searchParams?.ok ? decodeURIComponent(searchParams.ok) : "";

  const sb = supabaseServer();
  const { data: meRes } = await sb.auth.getUser();
  const user = meRes.user;

  const { data: membership } = await sb
    .from("memberships")
    .select("id,team_id,role")
    .eq("league_id", params.leagueId)
    .eq("user_id", user?.id || "")
    .maybeSingle();

  const { data: teams } = await sb
    .from("teams")
    .select("id,name,conference_name")
    .eq("league_id", params.leagueId)
    .order("conference_name", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h2">Settings</div>
        <p className="muted">Pick your team and role. This drives permissions and gameplay.</p>
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}
      </div>

      <div className="card col6">
        <div className="h2">Your role</div>
        <form action={selectRoleAction}>
          <input type="hidden" name="leagueId" value={params.leagueId} />

          <label className="small">Team</label>
          <select className="input" name="teamId" defaultValue={membership?.team_id || ""} required>
            <option value="" disabled>Select a team…</option>
            {(teams || []).map((t: any) => (
              <option key={t.id} value={t.id}>{t.conference_name} — {t.name}</option>
            ))}
          </select>

          <div style={{ height: 10 }} />

          <label className="small">Role</label>
          <select className="input" name="role" defaultValue={membership?.role || "Head Coach"}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <div style={{ height: 12 }} />
          <button className="btn primary" type="submit">Save</button>
        </form>
      </div>

      <div className="card col6">
        <div className="h2">Roadmap (next)</div>
        <ul className="muted">
          <li>Depth chart + redshirt decisions</li>
          <li>Recruiting: offers, visits, scouting accuracy</li>
          <li>Transfer Portal: bids, promises, tampering risk</li>
          <li>NIL: deals, collectives, budget tradeoffs</li>
          <li>Coach carousel: contract, buyout, hiring pools</li>
        </ul>
      </div>
    </div>
  );
}
