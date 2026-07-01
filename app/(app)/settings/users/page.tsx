import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashMessage } from "@/components/flash-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createUserByAdmin, resetUserPassword, updateUserRole } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams?: { notice?: string; error?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return <div className="text-muted-foreground">Admin access required.</div>;
  }

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <FlashMessage notice={searchParams?.notice} error={searchParams?.error} />
      <h1 className="text-2xl font-bold">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserByAdmin} className="grid gap-3 md:grid-cols-[1fr_1.2fr_1fr_180px_auto] md:items-end">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input
                name="full_name"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                placeholder="Boss name"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                placeholder="boss@example.com"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                placeholder="Minimum 6 characters"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Role
              <select name="role" defaultValue="report_viewer" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
                <option value="report_viewer">Report viewer</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <PendingSubmitButton type="submit" className="h-10 w-full md:w-auto" pendingText="Creating...">Create</PendingSubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All users ({users?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Role</TH><TH>Status</TH><TH>Password</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(users || []).map((u) => (
                <TR key={u.id}>
                  <TD>{u.full_name || u.id.slice(0, 8)}</TD>
                  <TD>
                    <form action={async (fd: FormData) => { "use server";
                      await updateUserRole(u.id, fd.get("role") as any, u.active);
                    }} className="flex min-w-[220px] items-center gap-2">
                      <select name="role" defaultValue={u.role} className="h-9 w-full rounded-md border px-2 text-sm">
                        <option value="report_viewer">Report viewer</option>
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <PendingSubmitButton size="sm" variant="outline" type="submit" pendingText="Saving...">Save</PendingSubmitButton>
                    </form>
                  </TD>
                  <TD>
                    <form action={async () => { "use server"; await updateUserRole(u.id, u.role, !u.active); }}>
                      <PendingSubmitButton size="sm" variant={u.active ? "ghost" : "default"} type="submit" pendingText="Updating...">
                        {u.active ? "Active" : "Deactivated"}
                      </PendingSubmitButton>
                    </form>
                  </TD>
                  <TD>
                    <form action={async (fd: FormData) => { "use server"; await resetUserPassword(u.id, fd); }} className="flex min-w-[230px] items-center gap-2">
                      <input
                        name="password"
                        type="password"
                        minLength={6}
                        required
                        className="h-9 w-full rounded-md border px-2 text-sm"
                        placeholder="New password"
                      />
                      <PendingSubmitButton size="sm" variant="outline" type="submit" pendingText="Resetting...">Reset</PendingSubmitButton>
                    </form>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{u.id === user.id ? "(you)" : ""}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
