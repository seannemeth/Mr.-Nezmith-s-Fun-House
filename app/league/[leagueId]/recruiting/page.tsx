// app/league/[leagueId]/recruiting/page.tsx
import RecruitingClient, { RecruitRow } from "./recruiting-client";

// IMPORTANT:
// Replace this import with YOUR server-side Supabase helper.
// Examples you might have:
// - import { supabaseServer } from "@/lib/supabase/server";
// - import { createClient } from "@/utils/supabase/server";
// - etc.
import { supabaseServer } from "../../../../lib/supabaseServer";

type PageProps = {
  params: { leagueId: string };
};

export default async function RecruitingPage({ params }: PageProps) {
  const leagueId = params.leagueId;

  const supabase = supabaseServer();

  // 1) Get current user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    // Replace with your preferred auth redirect/guard
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-2 text-sm text-red-600">Not authenticated.</p>
      </div>
    );
  }

  // 2) Find this user's team for this league
  // Assumes a memberships table like: memberships(user_id, league_id, team_id)
  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .maybeSingle();

  if (mErr || !membership?.team_id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <p className="mt-2 text-sm text-red-600">
          Could not determine your team for this league.
        </p>
      </div>
    );
  }

  const teamId = membership.team_id as string;

  // 3) Pull recruit list via RPC
  // Adjust arg names if your RPC differs.
  const { data: recruits, error: rErr } = await supabase.rpc("get_recruit_list_v1", {
    league_id: leagueId,
    team_id: teamId,
  });

  if (rErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Recruiting</h1>
        <pre className="mt-3 text-xs bg-black/5 p-3 rounded">
          {String(rErr.message ?? rErr)}
        </pre>
      </div>
    );
  }

  return (
    <RecruitingClient
      leagueId={leagueId}
      teamId={teamId}
      initialRecruits={(recruits ?? []) as RecruitRow[]}
    />
  );
}
