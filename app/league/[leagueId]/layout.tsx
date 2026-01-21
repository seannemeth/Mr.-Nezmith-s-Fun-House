
import Link from "next/link";

export default async function LeagueLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { leagueId: string };
}) {
  const leagueId = params.leagueId;

  return (
    <div className="grid">
      <div className="col12 subnav">
        <div className="subnavRow">
          <Link className="subnavLink" href={`/league/${leagueId}`}>Dashboard</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/standings`}>Standings</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/schedule`}>Schedule</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/teams`}>Teams</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/recruiting`}>Recruiting</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/portal`}>Transfer Portal</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/nil`}>NIL</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/coaches`}>Coaches</Link>
          <Link className="subnavLink" href={`/league/${leagueId}/settings`}>Settings</Link>
        </div>
      </div>
      <div className="col12">{children}</div>
    </div>
  );
}
