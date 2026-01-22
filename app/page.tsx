import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";
import { deleteLeagueAction } from "./actions";

export default async function HomePage({ searchParams }: { searchParams?: { err?: string; ok?: string } }) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const ok = searchParams?.ok ? decodeURIComponent(searchParams.ok) : "";

  const sb = supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return (
      <div className="grid">
        <div className="card col12">
          <div className="h1">CFB Text Dynasty</div>
          <p className="muted">A clean, replayable, text-first college football dynasty you can play online with friends.</p>
          <Link className="btn primary" href="/login">Sign in to start</Link>
        </div>
        <div className="card col12">
          <div className="h2">What’s included in this build</div>
          <ul className="muted">
            <li>Auth (Supabase)</li>
            <li>Create / Join / Delete leagues (commissioner-only delete)</li>
            <li>Generic FBS-style teams + conferences</li>
            <li>Schedule + Advance Week simulation</li>
            <li>85-man rosters per team</li>
            <li>Recruiting class (1000+ recruits)</li>
          </ul>
        </div>
      </div>
    );
  }

  const { data: leagues, error } = await sb
    .from("leagues")
    .select("id,name,invite_code,current_season,current_week,commissioner_id")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="card">
        <div className="h1">Leagues</div>
        <div className="err">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Your Leagues</div>
        <p className="muted">Create a dynasty, invite friends, pick roles, and advance seasons for decades.</p>
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn primary" href="/league/new">Create League</Link>
          <Link className="btn" href="/league/join">Join by Code</Link>
        </div>
      </div>

      <div className="card col12">
        <table className="table">
          <thead>
            <tr>
              <th>League</th>
              <th>Invite</th>
              <th>Season</th>
              <th>Week</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(leagues || []).map((l: any) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/league/${l.id}`} style={{ color: "var(--accent)" }}>{l.name}</Link>
                  <div className="small">ID: {l.id}</div>
                </td>
                <td><span className="badge">{l.invite_code}</span></td>
                <td>{l.current_season}</td>
                <td>{l.current_week}</td>
                <td>
                  <div className="row">
                    <Link className="btn" href={`/league/${l.id}`}>Open</Link>
                    <form action={deleteLeagueAction}>
                      <input type="hidden" name="leagueId" value={l.id} />
                      <button className="btn danger" type="submit" title="Commissioner only">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!leagues || leagues.length === 0) ? (
              <tr><td colSpan={5} className="muted">No leagues yet. Create one.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
