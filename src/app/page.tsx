import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";

export default async function HomePage() {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">CFB Text Dynasty</div>
        <p className="muted">Sign in to create or join an online league.</p>
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, league_id, leagues(name, invite_code, current_season, current_week)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Your Leagues</div>
        <p className="muted">Clean, text-based college football dynasties. Online with friends.</p>
      </div>

      {(memberships ?? []).map((m: any) => (
        <div key={m.league_id} className="card col6">
          <div className="h2">{m.leagues?.name}</div>
          <div className="muted">Season {m.leagues?.current_season}, Week {m.leagues?.current_week}</div>
          <div className="muted">Role: {m.role}</div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn" href={`/league/${m.league_id}`}>Open</Link>
            <div className="muted">Invite: <b>{m.leagues?.invite_code}</b></div>
          </div>
        </div>
      ))}

      <div className="card col6">
        <div className="h2">Start something new</div>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn" href="/league/new">Create League</Link>
          <Link className="btn secondary" href="/league/join">Join League</Link>
        </div>
      </div>
    </div>
  );
}
