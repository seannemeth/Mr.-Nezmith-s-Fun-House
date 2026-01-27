// app/league/[leagueId]/recruiting/page.tsx
import AdvanceWeekButton from "./AdvanceWeekButton";
import RecruitingClient from "./recruiting-client";
import { supabaseServer } from "../../../../lib/supabaseServer";

export default async function Page({
  params,
}: {
  params: { leagueId: string };
}) {
  const leagueId = params.leagueId;
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>Please sign in.</div>
      </div>
    );
  }

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id, commissioner_id, current_season, current_week")
    .eq("id", leagueId)
    .single();

  if (leagueErr || !league) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          League not found or not accessible.
        </div>
      </div>
    );
  }

  const isCommissioner = league.commissioner_id === user.id;

  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>{memErr.message}</div>
      </div>
    );
  }

  const teamId = membership?.team_id ?? null;

  if (!teamId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          You are not assigned to a team in this league.
        </div>
      </div>
    );
  }

  // Server-fetch recruits + capture RPC error
  let recruits: any[] = [];
  let rpcErrorMsg: string | null = null;

  const { data: recruitData, error: recruitErr } = await supabase.rpc(
    "get_recruit_list_v1",
    {
      p_league_id: leagueId,
      p_team_id: teamId,
    }
  );

  if (recruitErr) rpcErrorMsg = recruitErr.message;
  if (!recruitErr && Array.isArray(recruitData)) recruits = recruitData;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.1)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Season {league.current_season} · Week {league.current_week}
            </div>
          </div>

          <div style={{ minWidth: 180 }}>
            <AdvanceWeekButton leagueId={leagueId} disabled={!isCommissioner} />
          </div>
        </div>

        {!isCommissioner ? (
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Only the commissioner can advance the week.
          </div>
        ) : null}
      </div>

      <RecruitingClient
        leagueId={leagueId}
        teamId={teamId}
        recruits={recruits}
        rpcError={rpcErrorMsg}
      />
    </div>
  );
}
