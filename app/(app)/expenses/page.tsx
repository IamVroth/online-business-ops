import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createExpense, deleteExpense } from "@/lib/actions";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: { from?: string; to?: string; category?: string } }) {
  const supabase = createClient();
  const { data: categories } = await supabase.from("expense_categories").select("*").order("name");

  let q = supabase.from("expenses").select("*, expense_categories(name)").order("expense_date", { ascending: false });
  if (searchParams.from) q = q.gte("expense_date", searchParams.from);
  if (searchParams.to) q = q.lte("expense_date", searchParams.to);
  if (searchParams.category) q = q.eq("category_id", searchParams.category);
  const { data: expenses } = await q;

  const total = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Expenses</h1>

      <Card>
        <CardHeader><CardTitle>New expense</CardTitle></CardHeader>
        <CardContent>
          <form action={createExpense} className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end" encType="multipart/form-data">
            <div><Label>Date</Label><Input type="date" name="expense_date" defaultValue={toISODate(new Date())} required /></div>
            <div>
              <Label>Category</Label>
              <Select name="category_id" required>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Vendor</Label><Input name="vendor" /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" name="amount" required /></div>
            <div><Label>Receipt</Label><Input type="file" name="receipt" accept="image/*,application/pdf" /></div>
            <div className="flex items-center gap-2 h-10">
              <input type="checkbox" name="is_recurring" id="rec" />
              <Label htmlFor="rec">Recurring</Label>
            </div>
            <div className="md:col-span-6"><Label>Note</Label><Textarea name="note" rows={2} /></div>
            <div className="md:col-span-6"><Button type="submit" className="w-full sm:w-auto">Add expense</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex min-h-[92px] items-center p-4 sm:p-6">
          <form className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_auto] lg:items-end">
            <div><label className="block text-xs mb-1">From</label><input type="date" name="from" defaultValue={searchParams.from} className="h-10 w-full rounded-xl border px-3 text-sm" /></div>
            <div><label className="block text-xs mb-1">To</label><input type="date" name="to" defaultValue={searchParams.to} className="h-10 w-full rounded-xl border px-3 text-sm" /></div>
            <div>
              <label className="block text-xs mb-1">Category</label>
              <select name="category" defaultValue={searchParams.category || ""} className="h-10 w-full rounded-xl border px-3 text-sm">
                <option value="">All</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button type="submit" variant="outline" className="w-full lg:w-auto">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Results ({expenses?.length || 0}) — Total: {formatCurrency(total)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Category</TH><TH>Vendor</TH><TH>Note</TH><TH className="text-right">Amount</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(expenses || []).map((e: any) => (
                <TR key={e.id}>
                  <TD>{formatDate(e.expense_date)}</TD>
                  <TD>{e.expense_categories?.name || "—"}</TD>
                  <TD>{e.vendor || "—"}</TD>
                  <TD className="text-muted-foreground truncate max-w-xs">{e.note || "—"}</TD>
                  <TD className="text-right font-medium">{formatCurrency(e.amount)}</TD>
                  <TD className="text-right">
                    <form action={async () => { "use server"; await deleteExpense(e.id); }}>
                      <Button variant="ghost" size="sm" type="submit">Delete</Button>
                    </form>
                  </TD>
                </TR>
              ))}
              {(!expenses || expenses.length === 0) && (
                <TR><TD colSpan={6} className="text-center text-muted-foreground py-6">No expenses.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
