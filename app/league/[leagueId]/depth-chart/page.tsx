import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function DepthChartPage({
  params,
  searchParams
}: {
  params: { leagueId: string };
  searchParams?: { team?: string };
}) {
  const supabase = supabaseServer();
  const teamParam = searchParams?.team;

  const { data: userData } = await supabase.auth.getUser();

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name")
    .eq("id", params.leagueId)
    .single();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name")
    .eq("league_id", params.leagueId)
    .order("name", { ascending: true });

  const { data: myMembership } = userData.user
    ? await supabase
        .from("memberships")
        .select("team_id")
        .eq("league_id", params.leagueId)
        .eq("user_id", userData.user.id)
        .single()
    : { data: null as any };

  const teamId = (teamParam as string) || myMembership?.team_id || (teams?.[0]?.id ?? null);

  const { data: depth } = teamId
    ? await supabase
        .from("depth_chart")
        .select(
          "position,slot,player_id, players(name_first,name_last,position,quality,archetype)"
        )
        .eq("league_id", params.leagueId)
        .eq("team_id", teamId)
        .order("position", { ascending: true })
        .order("slot", { ascending: true })
    : { data: [] as any[] };

  const teamName = teams?.find((t: any) => t.id === teamId)?.name ?? "";

  const grouped = new Map<string, any[]>();
  (depth ?? []).forEach((d: any) => {
    const key = d.position;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Depth Chart — {league?.name}</div>
        <p className="muted">
          View-only MVP. Next step is editing starters/slots and adding formation packages.
        </p>

        <form method="get" className="row" style={{ gap: 10, marginTop: 8 }}>
          <label className="muted">Team</label>
          <select className="input" name="team" defaultValue={teamId ?? undefined}>
            {(teams ?? []).map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn secondary" type="submit">View</button>
        </form>
      </div>

      <div className="card col12">
        <div className="h2">{teamName || "Team"}</div>

        {grouped.size === 0 ? (
          <p className="muted">No depth chart found yet.</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {Array.from(grouped.entries()).map(([pos, rows]) => (
              <div key={pos} className="card col6">
                <div className="h3">{pos}</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Player</th>
                      <th>OVR</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={`${r.position}-${r.slot}`}> 
                        <td>{r.slot}</td>
                        <td>
                          {r.players?.name_first} {r.players?.name_last}
                        </td>
                        <td>{r.players?.quality}</td>
                        <td>{r.players?.archetype}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
