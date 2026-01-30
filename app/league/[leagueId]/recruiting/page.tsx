// app/league/[leagueId]/recruiting/page.tsx
import { redirect } from "next/navigation";
import RecruitingClient from "./recruiting-client";
import { supabaseServer } from "./_supabase-server";

type PageProps = {
  params: { leagueId: string };
};

type MembershipRow = {
  role?: string | null;
  team_id?: string | null;
};

async function getMembership(
  supabase: any,
  leagueId: string,
  userId: string
): Promise<MembershipRow | null> {
  const tables = ["league_memberships", "league_members", "memberships"];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("role, team_id")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) return data as MembershipRow;
  }

  return null;
}

export default async function RecruitingPage({ params }: PageProps) {
  const leagueId = params.leagueId;

  const supabase = supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;

  // Membership / team assignment (authoritative)
  const membership = await getMembership(supabase, leagueId, userId);

  if (!membership) {
    redirect("/league/join");
  }

  const teamId = membership.team_id ?? null;

  if (!teamId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          You’re in this league, but you don’t have a team assigned yet — recruiting is team-scoped.
        </p>
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div className="font-medium">Fix</div>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>
              Go to <span className="font-semibold">Teams</span>
            </li>
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

  // IMPORTANT:
  // We do NOT load recruits/season/week here anymore.
  // The client component loads:
  // - team_finances for cash/season/week
  // - recruits list
  // - recruiting_contacts for used buttons
  //
  // This also prevents any accidental UUID display server-side.
  return <RecruitingClient leagueId={leagueId} teamId={teamId} />;
}
