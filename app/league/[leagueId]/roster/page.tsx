import { supabaseServer } from "../../../../lib/supabaseServer";

type PageProps = {
  params: { leagueId: string };
  searchParams?: { team?: string; msg?: string; err?: string };
};

export default async function RosterPage({ params, searchParams }: PageProps) {
  const supabase = supabaseServer();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  // Auth
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return (
      <div className="card">
        <div className="h1">Roster</div>
        <p className="muted">Please sign in.</p>
        {userErr ? <p className="error">{userErr.message}</p> : null}
      </div>
    );
  }

  // League
  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,name")
    .eq("id", params.leagueId)
    .single();

  if (leagueErr) {
    return (
      <div className="card">
        <div className="h1">Roster</div>
        <p className="error">Could not load league.</p>
        <p className="muted">{leagueErr.message}</p>
      </div>
    );
  }

  // Membership (to default the team dropdown)
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", params.leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  const teamId = (searchParams?.team || myMembership?.team_id || "").trim() || null;

  // Teams list (conference optional)
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id,name,conference")
    .eq("league_id", params.leagueId)
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  if (teamsErr) {
    return (
      <div className="grid">
        <div className="card col12">
          <div className="h1">Roster — {league?.name}</div>
          <p className="error">Could not load teams.</p>
          <p className="muted">{teamsErr.message}</p>
        </div>
      </div>
    );
  }

  const selectedTeam = teamId ? (teams || []).find((t: any) => t.id === teamId) : null;

  // Players (only if a team is selected)
  let players: any[] = [];
  let playersErr: string | null = null;

  if (teamId) {
    const res = await supabase
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .order("position", { ascending: true })
      .order("quality", { ascending: false });

    if (res.error) playersErr = res.error.message;
    players = res.data || [];
  }

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
                  {(t.conference ? `${t.conference} — ` : "") + t.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              View
            </button>
          </form>
        </div>

        {!teamId ? (
          <p className="muted">Select a team to view its roster.</p>
        ) : playersErr ? (
          <p className="error">{playersErr}</p>
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
              {players.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.position}</td>
                  <td>
                    {p.name_first} {p.name_last}
                  </td>
                  <td>{p.class_year ? `Y${p.class_year}` : "—"}</td>
                  <td>{p.archetype || "—"}</td>
                  <td>{p.quality ?? "—"}</td>
                  <td>{"★".repeat(Math.max(1, Math.min(5, Number(p.stars || 1))))}</td>
                  <td>
                    {typeof p.height_in === "number" && p.height_in > 0
                      ? `${Math.floor(p.height_in / 12)}'${p.height_in % 12}" / ${p.weight_lb ?? "—"}`
                      : "—"}
                  </td>
                  <td>{p.state || "—"}</td>
                </tr>
              ))}

              {players.length === 0 ? (
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
