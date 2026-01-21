import Link from "next/link";

export default async function LeagueLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { leagueId: string };
}) {
  const { leagueId } = params;

  return (
    <div className="leagueShell">
      <div className="subnav">
        <div className="subnavRow">
          <Link className="subnavLink" href={`/league/${leagueId}`}>Dashboard</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/standings`}>Standings</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/schedule`}>Schedule</Link>

          {/* These will be “coming soon” pages for now (we can build next) */}
          <Link className="subnavLink" href={`/league/${leagueId}/teams`}>Teams</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/recruiting`}>Recruiting</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/portal`}>Transfer Portal</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/nil`}>NIL</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/coaches`}>Coaches</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/settings`}>League Settings</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}
