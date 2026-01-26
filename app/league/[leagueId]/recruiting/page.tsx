// app/league/[leagueId]/recruiting/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabaseServer";

type RecruitRow = {
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
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    // If something is wrong with auth, send to login rather than crashing
    redirect("/login");
  }
  const userId = userData?.user?.id;
  if (!userId) redirect("/login");

  // Get membership for this league (to obtain team_id + role)
  const { data: membership, error: membershipErr } = await supabase
    .from("memberships")
    .select("team_id, role")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipErr) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Recruiting</h1>
        <p style={{ color: "#b00020" }}>
          Membership lookup failed: {membershipErr.message}
        </p>
      </main>
    );
  }

  const teamId = membership?.team_id ?? null;
  if (!teamId) {
    // User is in league but hasn't selected a team/role properly
    redirect(`/league/${leagueId}/team-role`);
  }

  // Pagination (optional): ?page=0,1,2...
  const page = Math.max(0, Number(searchParams?.page ?? "0") || 0);
  const limit = 250;
  const offset = page * limit;

  // Call the RPC that we already proved works in production
  const { data, error: rpcErr } = await supabase.rpc("get_recruit_list_v1", {
    p_league_id: leagueId,
    p_limit: limit,
    p_offset: offset,
    p_only_uncommitted: true,
    // IMPORTANT: always pass a UUID or null; never undefined
    p_team_id: teamId,
  });

  if (rpcErr) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Recruiting</h1>
        <p style={{ color: "#b00020" }}>
          RPC get_recruit_list_v1 failed: {rpcErr.message}
        </p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          leagueId: {leagueId}
          {"\n"}userId: {userId}
          {"\n"}teamId: {teamId}
          {"\n"}limit: {limit}
          {"\n"}offset: {offset}
        </pre>
      </main>
    );
  }

  const recruits: RecruitRow[] = Array.isArray(data) ? (data as RecruitRow[]) : [];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Recruiting</h1>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
            League: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{leagueId}</span>
            {" • "}
            Team: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{teamId}</span>
            {" • "}
            Loaded: {recruits.length} (page {page + 1})
          </div>
        </div>

        <nav style={{ display: "flex", gap: 10 }}>
          <a
            href={`/league/${leagueId}/recruiting?page=${Math.max(0, page - 1)}`}
            style={{
              pointerEvents: page === 0 ? "none" : "auto",
              opacity: page === 0 ? 0.4 : 1,
              textDecoration: "none",
              border: "1px solid #ddd",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              color: "inherit",
            }}
          >
            Prev
          </a>
          <a
            href={`/league/${leagueId}/recruiting?page=${page + 1}`}
            style={{
              textDecoration: "none",
              border: "1px solid #ddd",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              color: "inherit",
            }}
          >
            Next
          </a>
        </nav>
      </header>

      {recruits.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No recruits returned.</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            This indicates the page query returned an empty list. Since your diagnostic proves recruits exist and the RPC works,
            this would typically mean the wrong leagueId/teamId is being used, or a different page is still deployed.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={th}>Rank</th>
                <th style={th}>Name</th>
                <th style={th}>Pos</th>
                <th style={th}>Stars</th>
                <th style={th}>OVR</th>
                <th style={th}>State</th>
                <th style={th}>Archetype</th>
                <th style={th}>Offer</th>
                <th style={th}>Visit</th>
              </tr>
            </thead>
            <tbody>
              {recruits.map((r) => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.rank}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      {r.id}
                    </div>
                  </td>
                  <td style={tdMono}>{r.pos}</td>
                  <td style={tdMono}>{r.stars}</td>
                  <td style={tdMono}>{r.ovr}</td>
                  <td style={td}>{r.state ?? "-"}</td>
                  <td style={td}>{r.archetype ?? "-"}</td>
                  <td style={td}>
                    {r.offer ? (
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        {JSON.stringify(r.offer)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={td}>
                    {r.visit ? (
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        {JSON.stringify(r.visit)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top",
};

const tdMono: React.CSSProperties = {
  ...td,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  whiteSpace: "nowrap",
};
