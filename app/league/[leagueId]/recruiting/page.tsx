// app/league/[leagueId]/recruiting/page.tsx
import { redirect } from "next/navigation";
import RecruitingClient from "./recruiting-client";
import { createServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: { leagueId: string };
};

type MembershipRow = {
  role?: string | null;
  team_id?: string | null;
};

function pickSeasonWeek(league: any): { season: number; week: number } {
  // supports a bunch of possible column names
  const season =
    Number(league?.current_season ?? league?.season ?? league?.active_season ?? 1) || 1;
  const week =
    Number(league?.current_week ?? league?.week ?? league?.active_week ?? 1) || 1;
  return { season, week };
}

async function getMembership(
  supabase: any,
  leagueId: string,
  userId: string
): Promise<MembershipRow | null> {
  // Try common membership table names so you don’t get stuck
  const tables = ["league_memberships", "league_members", "memberships"];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("role, team_id")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) return data as MembershipRow;

    // If table doesn't exist or columns differ, just try the next option
  }

  return null;
}

export default async function RecruitingPage({ params }: PageProps) {
  const leagueId = params.leagueId;

  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;

  // Load league (for season/week)
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .maybeSingle();

  const { season: currentSeason, week: currentWeek } = pickSeasonWeek(league);

  // Membership / team assignment
  const membership = await getMembership(supabase, leagueId, userId);

  if (!membership) {
    // If they aren't in the league, send to join. This is a legitimate redirect.
    redirect("/league/join");
  }

  const teamId = membership.team_id ?? null;
  const role = membership.role ?? "member";

  if (!teamId) {
    // IMPORTANT: do NOT redirect back to /league/:id (that creates the “nothing happens” loop)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          You’re in this league, but you don’t have a team assigned yet — recruiting is team-scoped.
        </p>

        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div className="font-medium">Fix</div>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Go to <span className="font-semibold">Teams</span></li>
            <li>Claim / assign yourself a team</li>
            <li>Come back to Recruiting</li>
          </ol>
        </div>

        <div className="mt-4 text-xs opacity-70">
          League ID: <code className="font-mono">{leagueId}</code>
        </div>
      </div>
    );
  }

  // Minimal recruits load to ensure the page renders.
  // This assumes you have a `recruits` table with `id` and `league_id`.
  // If your schema differs, adjust this query.
  const { data: recruitsRaw, error: recruitsErr } = await supabase
    .from("recruits")
    .select("*")
    .eq("league_id", leagueId)
    .limit(400);

  // If recruits aren’t seeded, still render a clear screen (no redirect loop).
  if (recruitsErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          Recruiting is temporarily unavailable due to a recruits query error.
        </p>
        <pre className="mt-4 rounded-lg bg-black/5 p-3 text-xs overflow-auto">
          {recruitsErr.message}
        </pre>
      </div>
    );
  }

  const recruits =
    (recruitsRaw ?? []).map((r: any) => ({
      ...r,
      _recruit_id: String(r.id ?? r.recruit_id ?? r._recruit_id),
      // these will render fine at 0/false until we wire interest/top8 views
      my_interest: r.my_interest ?? 0,
      top8: r.top8 ?? [],
      on_board: r.on_board ?? false,
      my_visit_week: r.my_visit_week ?? null,
      my_visit_bonus: r.my_visit_bonus ?? null,
      my_visit_applied: r.my_visit_applied ?? false,
    })) ?? [];

  return (
    <RecruitingClient
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
      leagueId={leagueId}
      teamId={teamId}
      recruits={recruits}
      currentSeason={currentSeason}
      currentWeek={currentWeek}
    />
  );
}
