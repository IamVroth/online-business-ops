"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Sale = { sale_date: string; total: number; channel: string | null };
type Expense = { expense_date: string; amount: number };
type FB = { date: string; spend: number; leads: number; campaign_name: string | null };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

function dailySeries(from: string, to: string, sales: Sale[], expenses: Expense[], fb: FB[]) {
  const days: Record<string, { date: string; revenue: number; expense: number; ad: number }> = {};
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const k = cur.toISOString().slice(0, 10);
    days[k] = { date: k, revenue: 0, expense: 0, ad: 0 };
    cur.setDate(cur.getDate() + 1);
  }
  sales.forEach((s) => { const k = s.sale_date; if (days[k]) days[k].revenue += Number(s.total || 0); });
  expenses.forEach((e) => { const k = e.expense_date; if (days[k]) days[k].expense += Number(e.amount || 0); });
  fb.forEach((f) => { const k = f.date; if (days[k]) days[k].ad += Number(f.spend || 0); });
  return Object.values(days);
}

export function DashboardCharts({ sales, expenses, fb, from, to }: { sales: Sale[]; expenses: Expense[]; fb: FB[]; from: string; to: string }) {
  const series = dailySeries(from, to, sales, expenses, fb);

  const byChannel: Record<string, number> = {};
  sales.forEach((s) => {
    const c = s.channel || "Other";
    byChannel[c] = (byChannel[c] || 0) + Number(s.total || 0);
  });
  const channelData = Object.entries(byChannel).map(([name, value]) => ({ name, value }));

  const byCampaign: Record<string, { spend: number; leads: number }> = {};
  fb.forEach((f) => {
    const k = f.campaign_name || "(unnamed)";
    if (!byCampaign[k]) byCampaign[k] = { spend: 0, leads: 0 };
    byCampaign[k].spend += Number(f.spend || 0);
    byCampaign[k].leads += Number(f.leads || 0);
  });
  const campaignData = Object.entries(byCampaign)
    .map(([name, v]) => ({ name, spend: v.spend, leads: v.leads }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Revenue vs Expenses vs Ad Spend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="ad" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sales by Channel</CardTitle></CardHeader>
        <CardContent>
          {channelData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top FB Campaigns (Spend)</CardTitle></CardHeader>
        <CardContent>
          {campaignData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FB data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tick={{ width: 80 }} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="spend" fill="#f59e0b" />
                <Bar dataKey="leads" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
