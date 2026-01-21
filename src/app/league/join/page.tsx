import { joinLeague } from "../../actions";

export default function JoinLeaguePage() {
  return (
    <div className="grid">
      <div className="card col12">
        <div className="h1">Join League</div>
        <p className="muted">Enter the invite code from your commissioner.</p>
        <form
          action={async (formData) => {
            "use server";
            await joinLeague(String(formData.get("code") || ""));
          }}
        >
          <input className="input" name="code" placeholder="INVITE CODE (8 chars)" />
          <div style={{ height: 12 }} />
          <button className="btn" type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}
