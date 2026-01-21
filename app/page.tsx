import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";
import { deleteLeagueAction } from "./actions";

export default async function HomePage({
  searchParams
}: {
  searchParams?: { msg?: string; err?: string };
}) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  if (!userData.user) {
    return (
      <div className="card">
        <div className="h1">CFB Text Dynasty</div>
        <p className="muted">Sign in to create or join an online league.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        <Link className="btn" href="/login">Sign in</Link>
      </div>
    );
  }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("role, league_id, leagues(name, invite_code, current_season, current_week)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Your Leagues</div>
        <p className="muted">Create a league, invite friends, and advance the season.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
        {error ? <p className="error">{error.message}</p> : null}
      </div>

      {(memberships ?? []).map((m: any) => {
        const league = m.leagues;
        return (
          <div key={m.league_id} className="card col6">
            <div className="h2">{league?.name ?? "League"}</div>
            <div className="muted">
              Season {league?.current_season ?? "—"}, Week {league?.current_week ?? "—"}
            </div>
            <div className="muted">Role: {m.role}</div>
            <div className="muted">
              Invite: <b>{league?.invite_code ?? "—"}</b>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn" href={`/league/${m.league_id}`}>Open</Link>

              {m.role === "commissioner" ? (
                <form action={deleteLeagueAction}>
                  <input type="hidden" name="leagueId" value={m.league_id} />
                  <button className="btn secondary" type="submit">
                    Delete
                  </button>
                </form>
              ) : null}
            </div>

            {m.role === "commissioner" ? (
              <p className="muted" style={{ marginTop: 10 }}>
                Delete removes the league and all its data for every member.
              </p>
            ) : null}
          </div>
        );
      })}

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
