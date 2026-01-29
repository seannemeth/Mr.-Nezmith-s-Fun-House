// app/league/[leagueId]/recruiting/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import RecruitingClient from "./recruiting-client";

type RecruitRow = Record<string, any>;

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components may not be allowed to set cookies in some contexts; ignore.
        }
      },
    },
  });
}

async function loadTeamNameMap(supabase: ReturnType<typeof supabaseServer>, leagueId: string) {
  // Try common table names; keep it tolerant.
  // Expected shape: { id, name } per team for this league.
  const attempts: Array<{ table: string; select: string }> = [
    { table: "teams", select: "id,name,league_id" },
    { table: "league_teams", select: "id,name,league_id" },
  ];

  for (const a of attempts) {
    const { data, error } = await supabase.from(a.table).select(a.select).eq("league_id", leagueId);
    if (!error && data && Array.isArray(data)) {
      const map: Record<string, string> = {};
      for (const t of data as any[]) map[String(t.id)] = String(t.name ?? t.school_name ?? t.display_name ?? "Unknown");
      return map;
    }
  }
  return {};
}

export default async function RecruitingPage({ params }: { params: { leagueId: string } }) {
  const leagueId = params.leagueId;

  const supabase = supabaseServer();

  // Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // Find membership/team
  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("team_id,league_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership?.team_id) redirect(`/league/${leagueId}`);

  const teamId = String(membership.team_id);

  // League season/week (season is required for offers insert)
  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,current_season,current_week")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueErr || !league) throw new Error("League not found.");
  const currentSeason = Number(league.current_season ?? 1);
  const currentWeek = Number(league.current_week ?? 1);

  // Recruits list (your existing tolerant RPC)
  const { data: recruitRows, error: recruitErr } = await supabase.rpc("get_recruit_list_v1", {
    p_league_id: leagueId,
    p_team_id: teamId,
  });

  if (recruitErr) throw new Error(recruitErr.message);

  const recruits: RecruitRow[] = Array.isArray(recruitRows) ? recruitRows : [];

  const recruitIds = recruits
    .map((r) => r.id ?? r.recruit_id)
    .filter(Boolean)
    .map((x) => String(x));

  // Interests for these recruits across ALL teams (to build Top 8 + my interest)
  let interests: Array<{ recruit_id: string; team_id: string; interest: number }> = [];
  if (recruitIds.length > 0) {
    const { data: interestRows, error: intErr } = await supabase
      .from("recruit_interests")
      .select("recruit_id,team_id,interest")
      .eq("league_id", leagueId)
      .in("recruit_id", recruitIds);

    if (!intErr && Array.isArray(interestRows)) {
      interests = (interestRows as any[]).map((x) => ({
        recruit_id: String(x.recruit_id),
        team_id: String(x.team_id),
        interest: Number(x.interest ?? 0),
      }));
    }
  }

  // Team names (for Top 8 display)
  const teamNameById = await loadTeamNameMap(supabase, leagueId);

  // Hydrate each recruit with: my_interest + top8[]
  const byRecruit: Record<string, Array<{ team_id: string; interest: number }>> = {};
  for (const row of interests) {
    (byRecruit[row.recruit_id] ??= []).push({ team_id: row.team_id, interest: row.interest });
  }

  const hydrated = recruits.map((r) => {
    const rid = String(r.id ?? r.recruit_id ?? "");
    const list = (byRecruit[rid] ?? []).slice().sort((a, b) => b.interest - a.interest);
    const top8 = list.slice(0, 8).map((x) => ({
      team_id: x.team_id,
      team_name: teamNameById[x.team_id] ?? "Unknown",
      interest: x.interest,
    }));
    const mine = list.find((x) => x.team_id === teamId)?.interest ?? 0;

    return {
      ...r,
      _recruit_id: rid,
      my_interest: mine,
      top8,
    };
  });

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Recruiting</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Season {currentSeason} • Week {currentWeek}
      </div>

      <RecruitingClient
        leagueId={leagueId}
        teamId={teamId}
        recruits={hydrated}
        currentSeason={currentSeason}
      />
    </div>
  );
}
