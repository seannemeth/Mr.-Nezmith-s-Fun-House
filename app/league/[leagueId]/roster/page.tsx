import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function RosterPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: { team?: string; msg?: string; err?: string };
}) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">Roster</div>
        <p className="muted">Please sign in.</p>
      </div>
    );
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name")
    .eq("id", params.leagueId)
    .single();

  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", params.leagueId)
    .eq("user_id", userData.user.id)
    .single();

  const teamId = searchParams?.team || myMembership?.team_id || null;

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,conference")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  const { data: players } = teamId
  ? await supabase
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .order("position", { ascending: true })
      .order("quality", { ascending: false })
  : { data: [] as any[] };


  const selectedTeam = teamId ? (teams || []).find((t: any) => t.id === teamId) : null;

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Roster — {league?.name}</div>
        <p className="muted">
          Each team starts with an 85-player roster. Attributes are randomized per league for replayability.
        </p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="h2">{selectedTeam ? selectedTeam.name : "Select a Team"}</div>
          <form method="get" className="row" style={{ gap: 8 }}>
            <select className="input" name="team" defaultValue={teamId ?? ""}>
              <option value="">— Choose team —</option>
              {(teams || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.conference} — {t.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">View</button>
          </form>
        </div>

        {!teamId ? (
          <p className="muted">Select a team to view its roster.</p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Name</th>
                <th>Yr</th>
                <th>Archetype</th>
                <th>OVR</th>
                <th>Stars</th>
                <th>Ht/Wt</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {(roster || []).map((p: any) => (
                <tr key={p.id}>
                  <td>{p.position}</td>
                  <td>{p.name_first} {p.name_last}</td>
                  <td>Y{p.class_year}</td>
                  <td>{p.archetype}</td>
                  <td>{p.quality}</td>
                  <td>{"★".repeat(Math.max(1, Math.min(5, p.stars || 1)))}</td>
                  <td>
                    {Math.floor(p.height_in / 12)}'{p.height_in % 12}" / {p.weight_lb}
                  </td>
                  <td>{p.state}</td>
                </tr>
              ))}
              {(!roster || roster.length === 0) ? (
                <tr>
                  <td className="muted" colSpan={8}>
                    No roster found yet. If this is a brand-new league, run the schema updates and recreate the league.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
