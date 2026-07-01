import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", user.id)
    .single();

  if (profile && profile.active === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Account deactivated</h1>
          <p className="text-muted-foreground mt-2">Contact your admin to restore access.</p>
          <form action="/auth/signout" method="post" className="mt-4">
            <button className="text-primary underline">Sign out</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-0 p-3 pb-24 md:flex-row md:gap-4 md:p-4">
      <Sidebar role={profile?.role || "staff"} userName={profile?.full_name || user.email || "User"} />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
