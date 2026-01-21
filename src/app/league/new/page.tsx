import { createLeague } from "../../actions";

const DEFAULT_TEAMS = [
  "North Valley", "Coastal State", "Metro Tech", "Pine Ridge",
  "Capital University", "River City", "Lakeshore", "Mountain A&M"
];

export default function NewLeaguePage() {
  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Create League</div>
        <p className="muted">Text-first. Clean UI. Built for long-running online dynasties.</p>

        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") || "My League");
            const rawTeams = String(formData.get("teams") || "");
            const teamNames = rawTeams
              .split("\n")
              .map(s => s.trim())
              .filter(Boolean);
            if (teamNames.length < 2) throw new Error("Add at least 2 teams.");
            await createLeague(name, teamNames);
          }}
        >
          <label className="muted">League name</label>
          <input className="input" name="name" placeholder="Example: Friday Night Dynasty" defaultValue="My Dynasty League" />
          <div style={{ height: 12 }} />

          <label className="muted">Teams (one per line)</label>
          <textarea
            className="input"
            name="teams"
            style={{ minHeight: 220 }}
            defaultValue={DEFAULT_TEAMS.join("\n")}
          />
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Create League</button>
        </form>
      </div>
    </div>
  );
}
