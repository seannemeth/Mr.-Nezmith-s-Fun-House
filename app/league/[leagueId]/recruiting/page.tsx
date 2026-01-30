// app/league/[leagueId]/recruiting/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import RecruitingClient from "./recruiting-client";

type RecruitRow = Record<string, any>;

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseServer() {
  const cookieStore = cookies();
  const url = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = reqEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // ignore (RSC cookie write limitations)
        }
      },
    },
  });
}

async function hasColumn(supabase: ReturnType<typeof supabaseServer>, table: string, col: string) {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", table)
    .eq("column_name", col)
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

async function loadTeamNameMap(supabase: ReturnType<typeof supabaseServer>, leagueId: string) {
  const attempts: Array<{ table: string; select: string }> = [
    { table: "teams", select: "id,name,league_id,school_name,display_name,short_name" },
    { table: "league_teams", select: "id,name,league_id,school_name,display_name,short_name" },
  ];

  for (const a of attempts) {
    const { data, error } = await supabase.from(a.table).select(a.select).eq("league_id", leagueId);
    if (!error && Array.isArray(data)) {
      const map: Record<string, string> = {};
      for (const t of data as any[]) {
        const id = String(t.id);
        const name = String(t.name ?? t.school_name ?? t.display_name ?? t.short_name ?? "Unknown");
        map[id] = name;
      }
      return map;
    }
  }

  return {};
}

export default async function RecruitingPage({ params }: { params: { leagueId: string } }) {
  const leagueId = params.leagueId;

  const supabaseUrl = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = reqEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = supabaseServer();

  // Auth
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) redirect("/login");
  const user = userRes.user;

  // Membership -> team
  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("team_id,league_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership?.team_id) redirect(`/league/${leagueId}`);
  const teamId = String(membership.team_id);

  // League season/week
  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,current_season,current_week")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueErr || !league) throw new Error("League not found.");
  const currentSeason = Number(league.current_season ?? 1);
  const currentWeek = Number(league.current_week ?? 1);

  // Recruits list RPC
  const PAGE_LIMIT = 250;
  const { data: recruitRows, error: recruitErr } = await supabase.rpc("get_recruit_list_v1", {
    p_league_id: leagueId,
    p_team_id: teamId,
    p_limit: PAGE_LIMIT,
    p_offset: 0,
    p_only_uncommitted: true,
  });

  if (recruitErr) throw new Error(recruitErr.message);

  const recruits: RecruitRow[] = Array.isArray(recruitRows) ? recruitRows : [];
  const recruitIds = recruits
    .map((r) => r.id ?? r.recruit_id)
    .filter(Boolean)
    .map((x) => String(x));

  // Board ids
  let boardIds = new Set<string>();
  {
    const { data: boardRows, error: bErr } = await supabase
      .from("recruiting_board")
      .select("recruit_id")
      .eq("league_id", leagueId)
      .eq("team_id", teamId)
      .eq("season", currentSeason);

    if (!bErr && Array.isArray(boardRows)) {
      boardIds = new Set(boardRows.map((x: any) => String(x.recruit_id)));
    }
  }

  // Interest rows (include visit_applied if present)
  type InterestRow = { recruit_id: string; team_id: string; interest: number; visit_applied: boolean };
  let interests: InterestRow[] = [];

  if (recruitIds.length > 0) {
    const hasVisitApplied = await hasColumn(supabase, "recruit_interests", "visit_applied");
    const interestSelect = hasVisitApplied
      ? "recruit_id,team_id,interest,visit_applied"
      : "recruit_id,team_id,interest";

    const { data: interestRows, error: intErr } = await supabase
      .from("recruit_interests")
      .select(interestSelect)
      .eq("league_id", leagueId)
      .in("recruit_id", recruitIds);

    if (!intErr && Array.isArray(interestRows)) {
      interests = (interestRows as any[]).map((x) => ({
        recruit_id: String(x.recruit_id),
        team_id: String(x.team_id),
        interest: Number(x.interest ?? 0),
        visit_applied: hasVisitApplied ? Boolean(x.visit_applied) : false,
      }));
    }
  }

  // Visits (my team only) — detect bonus column, but yours is BONUS
  type MyVisit = { recruit_id: string; week: number; bonus: number };
  const myVisitByRecruit: Record<string, MyVisit> = {};

  if (recruitIds.length > 0) {
    const hasVisitBonus = await hasColumn(supabase, "recruit_visits", "visit_bonus");
    const bonusCol = hasVisitBonus ? "visit_bonus" : "bonus";

    const { data: visitRows, error: vErr } = await supabase
      .from("recruit_visits")
      .select(`recruit_id,week,${bonusCol}`)
      .eq("league_id", leagueId)
      .eq("team_id", teamId)
      .in("recruit_id", recruitIds);

    if (!vErr && Array.isArray(visitRows)) {
      for (const v of visitRows as any[]) {
        const rid = String(v.recruit_id);
        const week = Number(v.week ?? 0);
        const bonus = Number(v[bonusCol] ?? 0);

        const cur = myVisitByRecruit[rid];
        if (!cur || (week > 0 && week < cur.week)) {
          myVisitByRecruit[rid] = { recruit_id: rid, week, bonus };
        }
      }
    }
  }

  const teamNameById = await loadTeamNameMap(supabase, leagueId);

  const byRecruit: Record<string, Array<{ team_id: string; interest: number; visit_applied: boolean }>> = {};
  for (const row of interests) {
    (byRecruit[row.recruit_id] ??= []).push({
      team_id: row.team_id,
      interest: row.interest,
      visit_applied: row.visit_applied,
    });
  }

  const hydrated = recruits.map((r) => {
    const rid = String(r.id ?? r.recruit_id ?? "");
    const list = (byRecruit[rid] ?? []).slice().sort((a, b) => b.interest - a.interest);

    const top8 = list.slice(0, 8).map((x) => ({
      team_id: x.team_id,
      team_name: teamNameById[x.team_id] ?? "Unknown",
      interest: x.interest,
    }));

    const myRow = list.find((x) => x.team_id === teamId);
    const myInterest = myRow?.interest ?? 0;
    const myVisitApplied = myRow?.visit_applied ?? false;

    const mv = myVisitByRecruit[rid];

    return {
      ...r,
      _recruit_id: rid,
      my_interest: myInterest,
      my_visit_applied: myVisitApplied,

      top8,
      on_board: boardIds.has(rid),

      my_visit_week: mv?.week ?? null,
      my_visit_bonus: mv?.bonus ?? null,
    };
  });

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Recruiting</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Season {currentSeason} • Week {currentWeek}
      </div>

      <RecruitingClient
        supabaseUrl={supabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
        leagueId={leagueId}
        teamId={teamId}
        recruits={hydrated}
        currentSeason={currentSeason}
        currentWeek={currentWeek}
      />
    </div>
  );
}
