import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabaseServer";

function enc(s: string) {
  return encodeURIComponent(s);
}

/**
 * Generic FBS-style presets: real locations, generic mascots (no real school nicknames).
 * Add/adjust as desired. Keep it “enough to start” and expandable later.
 */
const PRESETS: { id: string; name: string; description: string; teams: string[] }[] = [
  {
    id: "fbs-lite",
    name: "FBS Lite (64 teams)",
    description: "Fast start. 8 conferences of 8 teams.",
    teams: [
      // Atlantic
      "Boston Harbor Hawks",
      "New York Empire Knights",
      "Philadelphia Liberty Foxes",
      "Baltimore Bay Hounds",
      "Washington Capitol Sentinels",
      "Richmond River Rams",
      "Raleigh Oak Bulls",
      "Atlanta Metro Falcons",

      // Great Lakes
      "Pittsburgh Steel Wolves",
      "Cleveland Lake Captains",
      "Columbus Scarlet Stags",
      "Detroit Motor Titans",
      "Indianapolis Crossroads Colts",
      "Chicago Wind Whips",
      "Milwaukee Brew Badgers",
      "Minneapolis North Stars",

      // Southeast
      "Miami Storm Sharks",
      "Tampa Bay Sun Rays",
      "Orlando Citrus Owls",
      "Jacksonville Coast Jaguars",
      "Nashville Music Mustangs",
      "Charlotte Crown Cougars",
      "Charleston Harbor Sailors",
      "Savannah Tide Gators",

      // Plains
      "Dallas Lone Star Outlaws",
      "Houston Space Comets",
      "San Antonio Alamo Rangers",
      "Austin Hill Longhorns",
      "Oklahoma City Red Dirt Riders",
      "Wichita Wheat Warriors",
      "Kansas City Gate Chiefs",
      "St. Louis Arch Foxes",

      // Mountain
      "Denver Mile High Miners",
      "Colorado Springs Peak Pumas",
      "Salt Lake Summit Saints",
      "Boise Blue River Bears",
      "Albuquerque Desert Coyotes",
      "Phoenix Sun Scorpions",
      "Tucson Saguaro Cats",
      "Las Vegas Neon Knights",

      // Pacific
      "Los Angeles Coast Stars",
      "San Diego Surf Sharks",
      "San Francisco Bay Pilots",
      "San Jose Silicon Spartans",
      "Sacramento Gold Rushers",
      "Portland Pine Wolves",
      "Seattle Sound Orcas",
      "Spokane Inland Eagles",

      // Mid-Atlantic
      "Norfolk Navy Mariners",
      "Greensboro Gate Panthers",
      "Knoxville Ridge Raiders",
      "Louisville River Stallions",
      "Cincinnati Queen City Cougars",
      "Lexington Bluegrass Barons",
      "Morgantown Mountain Ravens",
      "Harrisburg Keystone Knights",

      // Northeast
      "Buffalo Snow Bisons",
      "Syracuse Salt City Stallions",
      "Rochester Flour Mill Foxes",
      "Albany Empire Eagles",
      "Providence Ocean Pirates",
      "Hartford Charter Hawks",
      "Newark Iron Knights",
      "Trenton River Raptors"
    ]
  },
  {
    id: "fbs-full",
    name: "FBS Full (134 teams) — Coming Next",
    description: "Placeholder for the full conference map. Use Lite for now.",
    teams: [] // intentionally empty for now
  }
];

async function createLeagueAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const presetId = String(formData.get("preset") || "").trim();

  if (!name) redirect(`/league/new?err=${enc("League name is required.")}`);

  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) redirect(`/league/new?err=${enc("Please choose a preset.")}`);

  if (!preset.teams || preset.teams.length < 2) {
    redirect(`/league/new?err=${enc("That preset is not available yet. Choose FBS Lite.")}`);
  }

  const supabase = supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?err=${enc("Please sign in first.")}`);

  // Call your RPC function
  const { data: leagueId, error } = await supabase.rpc("create_league_with_teams", {
    p_name: name,
    p_team_names: preset.teams
  });

  if (error) redirect(`/league/new?err=${enc(error.message)}`);
  if (!leagueId) redirect(`/league/new?err=${enc("League was not created. Try again.")}`);

  redirect(`/league/${leagueId}?msg=${enc("League created.")}`);
}

export default async function NewLeaguePage({
  searchParams
}: {
  searchParams?: { err?: string; msg?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";

  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Create League</div>
        <p className="muted">Choose a preset team set, then create your dynasty.</p>
        {msg ? <p className="success">{msg}</p> : null}
        {err ? <p className="error">{err}</p> : null}
      </div>

      <div className="card col12">
        <form action={createLeagueAction} className="grid" style={{ gap: 12 }}>
          <div className="col12">
            <label className="label">League Name</label>
            <input className="input" name="name" placeholder="e.g. Friday Night Dynasty" />
          </div>

          <div className="col12">
            <label className="label">Preset Team Set</label>
            <select className="input" name="preset" defaultValue="fbs-lite">
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} disabled={p.teams.length === 0}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="muted" style={{ marginTop: 6 }}>
              Tip: Start with Lite to validate gameplay loops. We can expand to full FBS once everything is stable.
            </p>
          </div>

          <div className="col12 row" style={{ gap: 8 }}>
            <button className="btn" type="submit">
              Create League
            </button>
            <Link className="btn secondary" href="/">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <div className="card col12">
        <div className="h2">What happens next</div>
        <ul className="muted">
          <li>League is created with the selected team set.</li>
          <li>Week 1 schedule is generated automatically.</li>
          <li>Next step: pick your team + role (AD/HC/OC/DC) and start recruiting.</li>
        </ul>
      </div>
    </div>
  );
}
