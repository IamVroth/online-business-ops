import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toISODate } from "@/lib/utils";
import { CalendarDays, DollarSign, TrendingUp, TrendingDown, ShoppingBag, Target } from "lucide-react";
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
    supabase.from("sales").select("sale_date, total, channel").gte("sale_date", from).lte("sale_date", to),
    supabase.from("expenses").select("expense_date, amount, category_id").gte("expense_date", from).lte("expense_date", to),
    supabase.from("fb_ad_insights").select("date, spend, leads, campaign_name").gte("date", from).lte("date", to),
  ]);

  const revenue = (sales || []).reduce((s, r) => s + Number(r.total || 0), 0);
  const orders = (sales || []).length;
  const totalExpense = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const adSpend = (fb || []).reduce((s, r) => s + Number(r.spend || 0), 0);
  const leads = (fb || []).reduce((s, r) => s + Number(r.leads || 0), 0);
  const profit = revenue - totalExpense;
  const aov = orders > 0 ? revenue / orders : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;

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
          <CardContent className="p-4">
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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

      <DashboardCharts sales={sales || []} expenses={expenses || []} fb={fb || []} from={from} to={to} />
    </div>
  );
}
