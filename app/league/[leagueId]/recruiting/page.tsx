// app/league/[leagueId]/recruiting/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";
import RecruitingClient from "./recruiting-client";

export type RecruitRow = {
  id: string;
  name: string;
  pos: string;
  stars: number;
  rank: number;
  state: string | null;
  archetype: string | null;
  ovr: number;
  top8: any[]; // jsonb
  offer: any | null;
  visit: any | null;
};

export default async function RecruitingPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams?: { page?: string };
}) {
  const leagueId = params.leagueId;

  const supabase = supabaseServer();

  // Require auth
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) redirect("/login");

  // Get membership (team_id, role) for this league
  const { data: membership } = await supabase
    .from("memberships")
    .select("team_id, role")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  const teamId = membership?.team_id ?? null;
  if (!teamId) redirect(`/league/${leagueId}/team-role`);

  const page = Math.max(0, Number(searchParams?.page ?? "0") || 0);
  const limit = 250;
  const offset = page * limit;

  const { data, error } = await supabase.rpc("get_recruit_list_v1", {
    p_league_id: leagueId,
    p_limit: limit,
    p_offset: offset,
    p_only_uncommitted: true,
    p_team_id: teamId, // always UUID (never undefined)
  });

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Recruiting</h1>
        <p style={{ color: "#b00020" }}>RPC get_recruit_list_v1 failed: {error.message}</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 10 }}>
leagueId: {leagueId}
userId: {userId}
teamId: {teamId}
limit: {limit}
offset: {offset}
        </pre>
      </main>
    );
  }

  const recruits: RecruitRow[] = Array.isArray(data) ? (data as RecruitRow[]) : [];

  return (
    <RecruitingClient
      leagueId={leagueId}
      teamId={teamId}
      page={page}
      pageSize={limit}
      recruits={recruits}
    />
  );
}
