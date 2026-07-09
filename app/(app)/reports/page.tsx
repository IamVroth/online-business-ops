import type { ComponentType, ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, toISODate } from "@/lib/utils";
import { BarChart3, Package, Receipt, Truck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const supabase = createClient();
  const defaultTo = new Date();
  const defaultFrom = addDays(defaultTo, -29);
  const from = searchParams.from || toISODate(defaultFrom);
  const to = searchParams.to || toISODate(defaultTo);

  const [{ data: sales }, { data: expenses }, { data: fb }] = await Promise.all([
    supabase
      .from("sales")
      .select("id,sale_date,customer_id,customer_name,customer_phone,channel,total")
      .gte("sale_date", from)
      .lte("sale_date", to)
      .order("sale_date", { ascending: false }),
    supabase
      .from("expenses")
      .select("id,expense_date,amount,vendor,note,expense_categories(name)")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false }),
    supabase
      .from("fb_ad_insights")
      .select("date,spend,leads,campaign_name")
      .gte("date", from)
      .lte("date", to),
  ]);

  const saleIds = (sales || []).map((sale) => sale.id);
  const { data: saleItems } = saleIds.length
    ? await supabase
        .from("sale_items")
        .select("sale_id,product_id,product_name,qty,subtotal,delivery_fee,delivery_fee_payer")
        .in("sale_id", saleIds)
    : { data: [] };

  const revenue = (sales || []).reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const orderCount = (sales || []).length;
  const expenseTotal = (expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const adSpend = (fb || []).reduce((sum, row) => sum + Number(row.spend || 0), 0);
  const leads = (fb || []).reduce((sum, row) => sum + Number(row.leads || 0), 0);
  const deliveryCustomer = (saleItems || []).reduce(
    (sum, item) => sum + (item.delivery_fee_payer === "customer" ? Number(item.delivery_fee || 0) : 0),
    0
  );
  const deliveryCompany = (saleItems || []).reduce(
    (sum, item) => sum + (item.delivery_fee_payer === "company" ? Number(item.delivery_fee || 0) : 0),
    0
  );
  const operatingCost = expenseTotal + adSpend + deliveryCompany;
  const netProfit = revenue - operatingCost;
  const aov = orderCount > 0 ? revenue / orderCount : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;

  const salesByChannel = Object.values(
    (sales || []).reduce((acc, sale) => {
      const key = sale.channel || "Other";
      acc[key] ||= { name: key, orders: 0, revenue: 0 };
      acc[key].orders += 1;
      acc[key].revenue += Number(sale.total || 0);
      return acc;
    }, {} as Record<string, { name: string; orders: number; revenue: number }>)
  ).sort((a, b) => b.revenue - a.revenue);

  const expensesByCategory = Object.values(
    (expenses || []).reduce((acc, expense: any) => {
      const key = expense.expense_categories?.name || "Uncategorized";
      acc[key] ||= { name: key, count: 0, amount: 0 };
      acc[key].count += 1;
      acc[key].amount += Number(expense.amount || 0);
      return acc;
    }, {} as Record<string, { name: string; count: number; amount: number }>)
  ).sort((a, b) => b.amount - a.amount);

  const topProducts = Object.values(
    (saleItems || []).reduce((acc, item) => {
      const key = item.product_id || item.product_name || "Unknown product";
      acc[key] ||= { name: item.product_name || "Unknown product", units: 0, revenue: 0 };
      acc[key].units += Number(item.qty || 0);
      acc[key].revenue += Number(item.subtotal || 0);
      return acc;
    }, {} as Record<string, { name: string; units: number; revenue: number }>)
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const topCustomers = Object.values(
    (sales || []).reduce((acc, sale) => {
      const key = sale.customer_id || `${sale.customer_name || "Walk-in"}-${sale.customer_phone || ""}`;
      acc[key] ||= { name: sale.customer_name || "Walk-in customer", phone: sale.customer_phone || "", orders: 0, revenue: 0 };
      acc[key].orders += 1;
      acc[key].revenue += Number(sale.total || 0);
      return acc;
    }, {} as Record<string, { name: string; phone: string; orders: number; revenue: number }>)
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const summaryCards = [
    { label: "Revenue", value: formatCurrency(revenue), detail: `${orderCount.toLocaleString()} orders` },
    { label: "Operating Cost", value: formatCurrency(operatingCost), detail: "Expenses + ads + company delivery" },
    { label: "Net Profit", value: formatCurrency(netProfit), detail: `${pct(netProfit, revenue)} margin` },
    { label: "Average Order", value: formatCurrency(aov), detail: "Revenue per order" },
    { label: "Ad Spend", value: formatCurrency(adSpend), detail: `${leads.toLocaleString()} leads · ${roas.toFixed(2)}x ROAS` },
    { label: "Delivery Expense", value: formatCurrency(deliveryCompany), detail: `${formatCurrency(deliveryCustomer)} paid by customer` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Business overview from {from} to {to}</p>
        </div>
        <Card className="w-full lg:w-auto">
          <CardContent className="flex min-h-[92px] items-center p-4">
            <form className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                <input type="date" name="from" defaultValue={from} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                <input type="date" name="to" defaultValue={to} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
              <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Apply</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4 sm:p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{card.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{card.detail}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportTable title="Sales by Channel" icon={BarChart3} empty="No sales in this period.">
          <THead><TR><TH>Channel</TH><TH className="text-right">Orders</TH><TH className="text-right">Revenue</TH><TH className="text-right">Share</TH></TR></THead>
          <TBody>
            {salesByChannel.map((row) => (
              <TR key={row.name}><TD className="font-medium">{row.name}</TD><TD className="text-right">{row.orders}</TD><TD className="text-right font-medium">{formatCurrency(row.revenue)}</TD><TD className="text-right">{pct(row.revenue, revenue)}</TD></TR>
            ))}
            {salesByChannel.length === 0 && <EmptyRow colSpan={4} label="No sales in this period." />}
          </TBody>
        </ReportTable>

        <ReportTable title="Expenses by Category" icon={Receipt} empty="No expenses in this period.">
          <THead><TR><TH>Category</TH><TH className="text-right">Entries</TH><TH className="text-right">Amount</TH><TH className="text-right">Share</TH></TR></THead>
          <TBody>
            {expensesByCategory.map((row) => (
              <TR key={row.name}><TD className="font-medium">{row.name}</TD><TD className="text-right">{row.count}</TD><TD className="text-right font-medium">{formatCurrency(row.amount)}</TD><TD className="text-right">{pct(row.amount, expenseTotal)}</TD></TR>
            ))}
            {expensesByCategory.length === 0 && <EmptyRow colSpan={4} label="No expenses in this period." />}
          </TBody>
        </ReportTable>

        <ReportTable title="Top Products" icon={Package} empty="No product sales in this period.">
          <THead><TR><TH>Product</TH><TH className="text-right">Units</TH><TH className="text-right">Revenue</TH></TR></THead>
          <TBody>
            {topProducts.map((row) => (
              <TR key={row.name}><TD className="font-medium">{row.name}</TD><TD className="text-right">{formatQuantity(row.units)}</TD><TD className="text-right font-medium">{formatCurrency(row.revenue)}</TD></TR>
            ))}
            {topProducts.length === 0 && <EmptyRow colSpan={3} label="No product sales in this period." />}
          </TBody>
        </ReportTable>

        <ReportTable title="Top Customers" icon={Users} empty="No customers in this period.">
          <THead><TR><TH>Customer</TH><TH>Phone</TH><TH className="text-right">Orders</TH><TH className="text-right">Revenue</TH></TR></THead>
          <TBody>
            {topCustomers.map((row) => (
              <TR key={`${row.name}-${row.phone}`}><TD className="font-medium">{row.name}</TD><TD>{row.phone || "—"}</TD><TD className="text-right">{row.orders}</TD><TD className="text-right font-medium">{formatCurrency(row.revenue)}</TD></TR>
            ))}
            {topCustomers.length === 0 && <EmptyRow colSpan={4} label="No customers in this period." />}
          </TBody>
        </ReportTable>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-teal-600" />Delivery Cost</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Paid By</TH><TH className="text-right">Amount</TH><TH>Business Meaning</TH></TR></THead>
            <TBody>
              <TR><TD className="font-medium">Customer</TD><TD className="text-right font-medium">{formatCurrency(deliveryCustomer)}</TD><TD className="text-muted-foreground">Collected from customer and included in sale total</TD></TR>
              <TR><TD className="font-medium">Company</TD><TD className="text-right font-medium">{formatCurrency(deliveryCompany)}</TD><TD className="text-muted-foreground">Company-paid delivery cost counted as operating cost</TD></TR>
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; empty: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-teal-600" />{title}</CardTitle></CardHeader>
      <CardContent><Table>{children}</Table></CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <TR><TD colSpan={colSpan} className="py-6 text-center text-muted-foreground">{label}</TD></TR>;
}
