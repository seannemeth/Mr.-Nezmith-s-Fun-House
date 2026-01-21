import Link from "next/link";
export default function NavBar({ userEmail }: { userEmail?: string | null }) {
  return (
    <div className="nav">
      <div className="row">
        <Link className="brand" href="/">CFB Text Dynasty</Link>
        <Link href="/">Home</Link>
        <Link href="/league/new">Create League</Link>
        <Link href="/league/join">Join League</Link>
      </div>
      <div className="row">
        {userEmail ? (
          <>
            <span className="muted" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail}
            </span>
            <Link className="btn secondary" href="/login">Account</Link>
          </>
        ) : (
          <Link className="btn" href="/login">Sign in</Link>
        )}
      </div>
    </div>
  );
}
