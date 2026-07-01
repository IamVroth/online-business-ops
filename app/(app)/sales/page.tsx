import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { deleteSale } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams: { from?: string; to?: string; channel?: string } }) {
  const supabase = createClient();
  let q = supabase.from("sales").select("*").order("sale_date", { ascending: false });
  if (searchParams.from) q = q.gte("sale_date", searchParams.from);
  if (searchParams.to) q = q.lte("sale_date", searchParams.to);
  if (searchParams.channel) q = q.eq("channel", searchParams.channel);
  const { data: sales } = await q;

  const total = (sales || []).reduce((s, r) => s + Number(r.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Button asChild className="w-full sm:w-auto"><Link href="/sales/new"><Plus className="h-4 w-4 mr-1" />New sale</Link></Button>
      </div>

      <Card>
        <CardContent className="flex min-h-[92px] items-center p-4 sm:p-6">
          <form className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_auto_auto] lg:items-end">
            <div><label className="block text-xs mb-1">From</label><input type="date" name="from" defaultValue={searchParams.from} className="h-10 w-full rounded-xl border px-3 text-sm" /></div>
            <div><label className="block text-xs mb-1">To</label><input type="date" name="to" defaultValue={searchParams.to} className="h-10 w-full rounded-xl border px-3 text-sm" /></div>
            <div><label className="block text-xs mb-1">Channel</label><input name="channel" defaultValue={searchParams.channel} className="h-10 w-full rounded-xl border px-3 text-sm" placeholder="e.g. Facebook" /></div>
            <Button type="submit" variant="outline" className="w-full lg:w-auto">Filter</Button>
            <Button asChild variant="ghost" className="w-full lg:w-auto"><Link href="/sales">Clear</Link></Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Results ({sales?.length || 0}) — Total: {formatCurrency(total)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Customer</TH><TH>Channel</TH><TH>Status</TH><TH className="text-right">Total</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(sales || []).map((s) => (
                <TR key={s.id}>
                  <TD>{formatDate(s.sale_date)}</TD>
                  <TD>{s.customer_name || "—"}</TD>
                  <TD>{s.channel || "—"}</TD>
                  <TD><span className="text-xs uppercase text-muted-foreground">{s.payment_status}</span></TD>
                  <TD className="text-right font-medium">{formatCurrency(s.total)}</TD>
                  <TD className="text-right">
                    <form action={async () => { "use server"; await deleteSale(s.id); }}>
                      <Button variant="ghost" size="sm" type="submit">Delete</Button>
                    </form>
                  </TD>
                </TR>
              ))}
              {(!sales || sales.length === 0) && (
                <TR><TD colSpan={6} className="text-center text-muted-foreground py-6">No sales yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
