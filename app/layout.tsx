import "../styles/globals.css";
import NavBar from "./components/NavBar";
import { supabaseServer } from "../lib/supabaseServer";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  return (
    <html lang="en">
      <body>
        <NavBar userEmail={data.user?.email ?? null} />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
