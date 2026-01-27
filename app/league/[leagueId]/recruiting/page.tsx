// app/league/[leagueId]/recruiting/page.tsx
import AdvanceWeekButton from "./AdvanceWeekButton";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export default async function RecruitingPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const leagueId = params.leagueId;
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, commissioner_id, current_season, current_week")
    .eq("id", leagueId)
    .single();

  const isCommissioner = Boolean(user && league && league.commissioner_id === user.id);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.10)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Recruiting</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Season {league?.current_season ?? "—"} · Week {league?.current_week ?? "—"}
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

      {/* Keep / replace this with your actual recruit list UI */}
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px dashed rgba(0,0,0,0.20)",
          opacity: 0.85,
        }}
      >
        Recruit list component goes here (keep your current implementation).
      </div>
    </div>
  );
}
