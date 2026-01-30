// app/league/[leagueId]/recruiting/page.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

// If you already have a client component, import it.
// Otherwise leave this placeholder and we’ll wire it next.
import RecruitingClient from "./recruiting-client";

type PageProps = {
  params: { leagueId: string };
};

export default async function RecruitingPage({ params }: PageProps) {
  const leagueId = params.leagueId;

  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Auth guard (redirect to login/home as you already do elsewhere)
  if (!session?.user?.id) {
    redirect("/");
  }

  // Membership guard: user must be in league_memberships
  // Adjust table name if yours differs (league_members, memberships, etc.)
  const { data: membership, error: membershipErr } = await supabase
    .from("league_memberships")
    .select("role, team_id")
    .eq("league_id", leagueId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (membershipErr) {
    // If your old code redirected here, that caused the bounce.
    // Instead, show a readable failure.
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          Recruiting is temporarily unavailable due to a membership lookup error.
        </p>
        <pre className="mt-4 rounded-lg bg-black/5 p-3 text-xs overflow-auto">
          {membershipErr.message}
        </pre>
      </div>
    );
  }

  if (!membership) {
    // Not in league: send to join (this is the only “expected” redirect)
    redirect("/league/join");
  }

  // Optional: verify recruits exist for this league
  // If recruits aren’t seeded yet, don’t redirect — show setup instructions.
  const { count: recruitCount } = await supabase
    .from("recruits")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId);

  if (!recruitCount || recruitCount === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          No recruits were found for this league yet.
        </p>
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div className="font-medium">Fix</div>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Confirm recruits seeding ran for this league_id.</li>
            <li>Then refresh this page.</li>
          </ol>
        </div>
        <div className="mt-4 text-xs opacity-70">
          League ID: <code className="font-mono">{leagueId}</code>
        </div>
      </div>
    );
  }

  // If membership has no team_id yet, don’t redirect — show selector instruction.
  if (!membership.team_id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-3 text-sm opacity-80">
          You’re in the league but not assigned to a team yet.
        </p>
        <div className="mt-4 rounded-lg border p-4 text-sm">
          Go to <span className="font-medium">Teams</span> and claim/assign a team,
          then return to Recruiting.
        </div>
        <div className="mt-4 text-xs opacity-70">
          League ID: <code className="font-mono">{leagueId}</code>
        </div>
      </div>
    );
  }

  // Normal path: render recruiting UI
  return (
    <RecruitingClient
      leagueId={leagueId}
      userId={session.user.id}
      teamId={membership.team_id}
      role={membership.role}
    />
  );
}
