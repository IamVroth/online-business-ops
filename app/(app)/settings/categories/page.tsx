import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createExpenseCategory, deleteExpenseCategory } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: cats } = await supabase.from("expense_categories").select("*").order("name");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Expense categories</h1>
      <Card>
        <CardHeader><CardTitle>Add category</CardTitle></CardHeader>
        <CardContent>
          <form action={createExpenseCategory} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex-1"><Label>Name</Label><Input name="name" required /></div>
            <Button type="submit" className="w-full sm:w-auto">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All categories</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Name</TH><TH></TH></TR></THead>
            <TBody>
              {(cats || []).map((c) => (
                <TR key={c.id}>
                  <TD>{c.name}</TD>
                  <TD className="text-right">
                    <form action={async () => { "use server"; await deleteExpenseCategory(c.id); }}>
                      <Button variant="ghost" size="sm" type="submit">Delete</Button>
                    </form>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
