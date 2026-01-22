import Link from "next/link";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { leagueId: string };
}) {
  const sb = supabaseServer();
  const { data: league } = await sb
    .from("leagues")
    .select("id,name,invite_code,current_season,current_week")
    .eq("id", params.leagueId)
    .maybeSingle();

  return (
    <div className="grid">
      <div className="card col12">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">{league?.name || "League"}</div>
            <div className="kpi">
              <span className="badge">Invite: {league?.invite_code || "—"}</span>
              <span className="badge">Season: {league?.current_season || "—"}</span>
              <span className="badge">Week: {league?.current_week || "—"}</span>
            </div>
          </div>
          <Link className="btn" href="/">All leagues</Link>
        </div>

        <div className="hr" />

        <div className="row">
          <Link className="btn" href={`/league/${params.leagueId}`}>Dashboard</Link>
          <Link className="btn" href={`/league/${params.leagueId}/teams`}>Teams</Link>
          <Link className="btn" href={`/league/${params.leagueId}/schedule`}>Schedule</Link>
          <Link className="btn" href={`/league/${params.leagueId}/recruiting`}>Recruiting</Link>
          <Link className="btn" href={`/league/${params.leagueId}/portal`}>Transfer Portal</Link>
          <Link className="btn" href={`/league/${params.leagueId}/nil`}>NIL</Link>
          <Link className="btn" href={`/league/${params.leagueId}/coaches`}>Coaches</Link>
          <Link className="btn" href={`/league/${params.leagueId}/settings`}>Settings</Link>
        </div>
      </div>

      <div className="col12">{children}</div>
    </div>
  );
}
