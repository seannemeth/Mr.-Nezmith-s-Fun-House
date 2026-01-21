import "../styles/globals.css";
import { supabaseServer } from "../lib/supabaseServer";
import NavBar from "./components/NavBar";

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <html lang="en">
      <body>
        <NavBar userEmail={user?.email ?? null} />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
