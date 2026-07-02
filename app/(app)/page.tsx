import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCurrency, toISODate } from "@/lib/utils";
import { CalendarDays, DollarSign, Package, ShoppingBag, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function parseMonth(month: string | undefined) {
  const match = String(month || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function DashboardPage({ searchParams }: { searchParams: { from?: string; to?: string; preset?: string; month?: string } }) {
  const supabase = createClient();
  const now = new Date();
  const lastMonth = addMonths(now, -1);
  const selectedPreset = searchParams.preset || (searchParams.month ? "specific_month" : searchParams.from && searchParams.to ? "custom" : "last_month");
  const selectedMonth = parseMonth(searchParams.month) || lastMonth;
  const period =
    selectedPreset === "specific_month"
      ? { from: monthStart(selectedMonth), to: monthEnd(selectedMonth) }
      : selectedPreset === "last_two_months"
        ? { from: monthStart(addMonths(now, -2)), to: monthEnd(lastMonth) }
        : selectedPreset === "custom" && searchParams.from && searchParams.to
          ? { from: new Date(`${searchParams.from}T00:00:00`), to: new Date(`${searchParams.to}T00:00:00`) }
          : { from: monthStart(lastMonth), to: monthEnd(lastMonth) };
  const from = toISODate(period.from);
  const to = toISODate(period.to);

  const [{ data: sales }, { data: expenses }, { data: fb }] = await Promise.all([
    supabase.from("sales").select("id, sale_date, total, channel").gte("sale_date", from).lte("sale_date", to),
    supabase.from("expenses").select("expense_date, amount, category_id").gte("expense_date", from).lte("expense_date", to),
    supabase.from("fb_ad_insights").select("date, spend, leads, campaign_name").gte("date", from).lte("date", to),
  ]);
  const saleIds = (sales || []).map((sale) => sale.id);
  const { data: saleItems } = saleIds.length > 0
    ? await supabase
      .from("sale_items")
      .select("sale_id, product_id, product_name, qty, subtotal")
      .in("sale_id", saleIds)
    : { data: [] };

  const revenue = (sales || []).reduce((s, r) => s + Number(r.total || 0), 0);
  const orders = (sales || []).length;
  const totalExpense = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const adSpend = (fb || []).reduce((s, r) => s + Number(r.spend || 0), 0);
  const leads = (fb || []).reduce((s, r) => s + Number(r.leads || 0), 0);
  const profit = revenue - totalExpense;
  const aov = orders > 0 ? revenue / orders : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const productSummaries = Array.from(
    (saleItems || []).reduce((acc, item) => {
      const key = item.product_id || item.product_name || "Unknown product";
      const current = acc.get(key) || {
        name: item.product_name || "Unknown product",
        units: 0,
        revenue: 0,
        saleIds: new Set<string>(),
      };
      current.units += Number(item.qty || 0);
      current.revenue += Number(item.subtotal || 0);
      current.saleIds.add(item.sale_id);
      acc.set(key, current);
      return acc;
    }, new Map<string, { name: string; units: number; revenue: number; saleIds: Set<string> }>())
  )
    .map(([, value]) => ({
      name: value.name,
      units: value.units,
      revenue: value.revenue,
      orders: value.saleIds.size,
    }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 8);
  const topByUnits = productSummaries[0];
  const topByRevenue = [...productSummaries].sort((a, b) => b.revenue - a.revenue || b.units - a.units)[0];

  const kpis = [
    { label: "Revenue", value: formatCurrency(revenue), icon: DollarSign, chip: "bg-emerald-50 text-emerald-600" },
    { label: "Expenses", value: formatCurrency(totalExpense), icon: TrendingDown, chip: "bg-rose-50 text-rose-600" },
    { label: "Net Profit", value: formatCurrency(profit), icon: TrendingUp, chip: profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600" },
    { label: "Orders", value: String(orders), icon: ShoppingBag, chip: "bg-blue-50 text-blue-600" },
    { label: "AOV", value: formatCurrency(aov), icon: DollarSign, chip: "bg-indigo-50 text-indigo-600" },
    { label: "Ad Spend", value: formatCurrency(adSpend), icon: Target, chip: "bg-amber-50 text-amber-600" },
    { label: "ROAS", value: roas.toFixed(2) + "x", icon: TrendingUp, chip: "bg-purple-50 text-purple-600" },
    { label: "Leads", value: String(leads), icon: Target, chip: "bg-pink-50 text-pink-600" },
  ];

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{today} · showing {from} → {to}</p>
        </div>
        <Card className="w-full lg:w-auto">
          <CardContent className="flex min-h-[92px] items-center p-4">
          <form className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="min-w-0">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Period
              </label>
              <select name="preset" defaultValue={selectedPreset === "custom" ? "last_month" : selectedPreset} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                <option value="last_month">Last month</option>
                <option value="last_two_months">Last two months</option>
                <option value="specific_month">Specific month</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Month</label>
              <input type="month" name="month" defaultValue={monthValue(selectedMonth)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
            </div>
            <button className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800 sm:w-auto">Apply</button>
          </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.chip}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {productSummaries.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <Trophy className="h-4 w-4" />
                    Most units sold
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{topByUnits.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatQuantity(topByUnits.units)} units · {formatCurrency(topByUnits.revenue)}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <DollarSign className="h-4 w-4" />
                    Highest sales amount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{topByRevenue.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(topByRevenue.revenue)} · {formatQuantity(topByRevenue.units)} units
                  </div>
                </div>
              </div>

              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH className="text-right">Units Sold</TH>
                    <TH className="text-right">Orders</TH>
                    <TH className="text-right">Sales Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {productSummaries.map((product, index) => (
                    <TR key={product.name}>
                      <TD className="font-medium">
                        <span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>
                        {product.name}
                      </TD>
                      <TD className="text-right tabular-nums">{formatQuantity(product.units)}</TD>
                      <TD className="text-right tabular-nums">{product.orders.toLocaleString()}</TD>
                      <TD className="text-right tabular-nums font-medium">{formatCurrency(product.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
              No product sales in this period.
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardCharts sales={sales || []} expenses={expenses || []} fb={fb || []} from={from} to={to} />
    </div>
  );
}
