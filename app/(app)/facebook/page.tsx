import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";
import { FbCsvUploader } from "@/components/fb-csv-uploader";
import { FbContentCsvUploader } from "@/components/fb-content-csv-uploader";
import { BarChart3, CalendarDays, FileImage, FileUp, Megaphone, MousePointerClick, Newspaper, TrendingUp, Users, Video } from "lucide-react";

export const dynamic = "force-dynamic";

type ContentMetricRow = {
  id: string;
  page_name: string;
  content_title: string | null;
  content_url: string | null;
  content_type: string | null;
  date: string;
  reach: number | string;
  impressions: number | string;
  engagements: number | string;
  reactions: number | string;
  comments: number | string;
  shares: number | string;
  clicks: number | string;
  video_views: number | string;
};

type PageMetricSummary = {
  page_name: string;
  posts: number;
  image_posts: number;
  video_posts: number;
  reach: number;
  impressions: number;
  engagements: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  video_views: number;
};

function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString();
}

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

function campaignName(value: string | null | undefined) {
  return value?.trim() || "(unnamed)";
}

function selectedParamValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function postTypeLabel(type: string | null | undefined) {
  const value = String(type || "").trim().toLowerCase();
  if (value.includes("video") || value.includes("reel")) return "Video";
  if (value.includes("photo") || value.includes("image")) return "Image";
  return type ? String(type) : "Other";
}

function contentIdentity(row: ContentMetricRow) {
  const contentKey = row.content_url || row.content_title || row.id;
  return [
    row.page_name || "Unknown page",
    row.date || "",
    postTypeLabel(row.content_type),
    contentKey,
  ].join("|");
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="h-full">
      <CardContent className="flex min-h-[96px] flex-col justify-center px-5 py-4 sm:min-h-[112px] sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-3 text-2xl font-bold leading-none tracking-tight sm:text-[1.7rem]">{value}</div>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default async function FacebookPage({ searchParams }: { searchParams: { from?: string; to?: string; all?: string; preset?: string; month?: string; contentPage?: string; campaign?: string | string[] } }) {
  const supabase = createClient();
  const today = new Date();
  const lastMonth = addMonths(today, -1);
  const selectedPreset = searchParams.preset || (searchParams.month ? "specific_month" : searchParams.from && searchParams.to ? "custom" : "last_month");
  const selectedMonth = parseMonth(searchParams.month) || lastMonth;
  const period =
    selectedPreset === "specific_month"
      ? { from: monthStart(selectedMonth), to: monthEnd(selectedMonth) }
      : selectedPreset === "last_two_months"
        ? { from: monthStart(addMonths(today, -2)), to: monthEnd(lastMonth) }
        : selectedPreset === "custom" && searchParams.from && searchParams.to
          ? { from: new Date(`${searchParams.from}T00:00:00`), to: new Date(`${searchParams.to}T00:00:00`) }
          : { from: monthStart(lastMonth), to: monthEnd(lastMonth) };
  const from = toISODate(period.from);
  const to = toISODate(period.to);
  const showAll = searchParams.all === "1";
  const selectedCampaigns = selectedParamValues(searchParams.campaign);
  const contentPageSize = 25;
  const requestedContentPage = Number(searchParams.contentPage || 1);

  let query = supabase
    .from("fb_ad_insights")
    .select("*")
    .gte("date", from).lte("date", to)
    .order("spend", { ascending: false });
  if (!showAll) query = query.gt("spend", 0);
  const { data: adRows } = await query;
  const campaignOptions = Array.from(new Set((adRows || []).map((row) => campaignName(row.campaign_name)))).sort((a, b) => a.localeCompare(b));
  const rows = selectedCampaigns.length > 0
    ? (adRows || []).filter((row) => selectedCampaigns.includes(campaignName(row.campaign_name)))
    : (adRows || []);

  const { data: contentRows } = await supabase
    .from("fb_page_content_metrics")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("engagements", { ascending: false });
  const uniqueContentRows = Object.values(
    ((contentRows || []) as ContentMetricRow[]).reduce<Record<string, ContentMetricRow>>((acc, row) => {
      const key = contentIdentity(row);
      if (!acc[key]) acc[key] = row;
      return acc;
    }, {})
  );

  const totals = (rows || []).reduce(
    (acc, r) => ({
      spend: acc.spend + Number(r.spend || 0),
      reach: acc.reach + Number(r.reach || 0),
      impressions: acc.impressions + Number(r.impressions || 0),
      clicks: acc.clicks + Number(r.clicks || 0),
      leads: acc.leads + Number(r.leads || 0),
    }),
    { spend: 0, reach: 0, impressions: 0, clicks: 0, leads: 0 }
  );
  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const pageSummaries = Object.values(
    uniqueContentRows.reduce<Record<string, PageMetricSummary>>((acc, row) => {
      const pageName = row.page_name || "Unknown page";
      if (!acc[pageName]) {
        acc[pageName] = {
          page_name: pageName,
          posts: 0,
          image_posts: 0,
          video_posts: 0,
          reach: 0,
          impressions: 0,
          engagements: 0,
          reactions: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          video_views: 0,
        };
      }
      const type = postTypeLabel(row.content_type);
      acc[pageName].posts += 1;
      if (type === "Image") acc[pageName].image_posts += 1;
      if (type === "Video") acc[pageName].video_posts += 1;
      acc[pageName].reach += Number(row.reach || 0);
      acc[pageName].impressions += Number(row.impressions || 0);
      acc[pageName].engagements += Number(row.engagements || 0);
      acc[pageName].reactions += Number(row.reactions || 0);
      acc[pageName].comments += Number(row.comments || 0);
      acc[pageName].shares += Number(row.shares || 0);
      acc[pageName].clicks += Number(row.clicks || 0);
      acc[pageName].video_views += Number(row.video_views || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.engagements - a.engagements);
  const contentTotals = pageSummaries.reduce(
    (acc, page) => ({
      posts: acc.posts + page.posts,
      reach: acc.reach + page.reach,
      impressions: acc.impressions + page.impressions,
      engagements: acc.engagements + page.engagements,
      clicks: acc.clicks + page.clicks,
      video_views: acc.video_views + page.video_views,
    }),
    { posts: 0, reach: 0, impressions: 0, engagements: 0, clicks: 0, video_views: 0 }
  );
  const engagementRate = contentTotals.reach > 0 ? (contentTotals.engagements / contentTotals.reach) * 100 : 0;
  const postTypeTotals = uniqueContentRows.reduce(
    (acc, row) => {
      const type = postTypeLabel(row.content_type);
      if (type === "Image") acc.image += 1;
      if (type === "Video") acc.video += 1;
      return acc;
    },
    { image: 0, video: 0 }
  );
  const contentPageCount = Math.max(1, Math.ceil(uniqueContentRows.length / contentPageSize));
  const contentPage = Math.min(Math.max(Number.isFinite(requestedContentPage) ? requestedContentPage : 1, 1), contentPageCount);
  const paginatedContentRows = uniqueContentRows.slice((contentPage - 1) * contentPageSize, contentPage * contentPageSize);
  const pageStart = uniqueContentRows.length === 0 ? 0 : (contentPage - 1) * contentPageSize + 1;
  const pageEnd = Math.min(contentPage * contentPageSize, uniqueContentRows.length);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedPreset === "custom") {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.set("preset", selectedPreset);
      if (selectedPreset === "specific_month") params.set("month", monthValue(selectedMonth));
    }
    if (showAll) params.set("all", "1");
    selectedCampaigns.forEach((campaign) => params.append("campaign", campaign));
    if (page > 1) params.set("contentPage", String(page));
    return `/facebook?${params.toString()}`;
  };
  const baseFilterParams = new URLSearchParams();
  if (selectedPreset === "custom") {
    baseFilterParams.set("from", from);
    baseFilterParams.set("to", to);
  } else {
    baseFilterParams.set("preset", selectedPreset);
    if (selectedPreset === "specific_month") baseFilterParams.set("month", monthValue(selectedMonth));
  }
  if (showAll) baseFilterParams.set("all", "1");
  const campaignClearHref = `/facebook?${baseFilterParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Reporting workspace
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Social Media Report</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review paid campaign performance and Facebook page content metrics in one clean report.
          </p>
        </div>

        <Card className="w-full lg:min-w-[520px]">
          <CardContent className="p-4">
            <form className="grid gap-3 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
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
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <input type="checkbox" name="all" value="1" defaultChecked={showAll} />
                Zero-spend
              </label>
              <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Apply</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold">Paid Campaign Performance</h2>
            <p className="text-sm text-muted-foreground">Ad spend, leads, clicks, and campaign efficiency for the selected period.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-5 md:gap-4">
          <MetricCard label="Spend" value={formatCurrency(totals.spend)} />
          <MetricCard label="Leads" value={formatNumber(totals.leads)} />
          <MetricCard label="CPL" value={formatCurrency(cpl)} />
          <MetricCard label="Clicks" value={formatNumber(totals.clicks)} />
          <MetricCard label="CTR" value={`${ctr.toFixed(2)}%`} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-indigo-600" />
            Campaign Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {selectedPreset !== "custom" && <input type="hidden" name="preset" value={selectedPreset} />}
            {selectedPreset === "specific_month" && <input type="hidden" name="month" value={monthValue(selectedMonth)} />}
            {selectedPreset === "custom" && (
              <>
                <input type="hidden" name="from" value={from} />
                <input type="hidden" name="to" value={to} />
              </>
            )}
            {showAll && <input type="hidden" name="all" value="1" />}
            {campaignOptions.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {campaignOptions.map((campaign) => (
                  <label key={campaign} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="campaign"
                      value={campaign}
                      defaultChecked={selectedCampaigns.includes(campaign)}
                      className="mt-0.5"
                    />
                    <span className="line-clamp-2">{campaign}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No campaigns available for this period.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
                Apply Campaign Filter
              </button>
              {selectedCampaigns.length > 0 && (
                <Link href={campaignClearHref} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Clear campaigns
                </Link>
              )}
              <p className="text-sm text-muted-foreground">
                {selectedCampaigns.length > 0 ? `${selectedCampaigns.length} selected` : "All campaigns selected"}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Campaign Details ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH className="w-[240px]">Campaign</TH>
                <TH className="whitespace-nowrap">Period</TH>
                <TH className="text-right whitespace-nowrap">Spend</TH>
                <TH className="text-right whitespace-nowrap">Reach</TH>
                <TH className="text-right whitespace-nowrap">Impr.</TH>
                <TH className="text-right whitespace-nowrap">Clicks</TH>
                <TH className="text-right whitespace-nowrap">Leads</TH>
                <TH className="text-right whitespace-nowrap">CPL</TH>
              </TR>
            </THead>
            <TBody>
              {(rows || []).map((r) => {
                const rowCpl = Number(r.leads) > 0 ? Number(r.spend) / Number(r.leads) : 0;
                return (
                  <TR key={r.id}>
                    <TD className="font-medium">
                      <div className="max-w-[240px] truncate" title={r.campaign_name || ""}>
                        {r.campaign_name || "—"}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground text-xs">
                      {formatDate(r.date)}{r.date_end ? ` → ${formatDate(r.date_end)}` : ""}
                    </TD>
                    <TD className="text-right tabular-nums font-medium">{formatCurrency(r.spend)}</TD>
                    <TD className="text-right tabular-nums">{Number(r.reach).toLocaleString()}</TD>
                    <TD className="text-right tabular-nums">{Number(r.impressions).toLocaleString()}</TD>
                    <TD className="text-right tabular-nums">{Number(r.clicks).toLocaleString()}</TD>
                    <TD className="text-right tabular-nums">{Number(r.leads).toLocaleString()}</TD>
                    <TD className="text-right tabular-nums text-muted-foreground">
                      {rowCpl > 0 ? formatCurrency(rowCpl) : "—"}
                    </TD>
                  </TR>
                );
              })}
              {(!rows || rows.length === 0) && (
                <TR><TD colSpan={8} className="text-center text-muted-foreground py-6">No paid campaign data for this date range.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-xl font-semibold">Page Content Performance</h2>
            <p className="text-sm text-muted-foreground">See which Facebook pages and posts are getting reach, engagement, clicks, and views.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 md:gap-4">
          <MetricCard label="Pages" value={pageSummaries.length} />
          <MetricCard label="Image Posts" value={formatNumber(postTypeTotals.image)} />
          <MetricCard label="Video Posts" value={formatNumber(postTypeTotals.video)} />
          <MetricCard label="Reach" value={formatNumber(contentTotals.reach)} />
          <MetricCard label="Impr." value={formatNumber(contentTotals.impressions)} />
          <MetricCard label="Engagements" value={formatNumber(contentTotals.engagements)} />
          <MetricCard label="Eng. Rate" value={`${engagementRate.toFixed(2)}%`} />
        </div>
      </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Performance by Page ({pageSummaries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Page</TH>
                  <TH className="text-right whitespace-nowrap">Image Posts</TH>
                  <TH className="text-right whitespace-nowrap">Video Posts</TH>
                  <TH className="text-right whitespace-nowrap">Reach</TH>
                  <TH className="text-right whitespace-nowrap">Impr.</TH>
                  <TH className="text-right whitespace-nowrap">Engagements</TH>
                  <TH className="text-right whitespace-nowrap">Clicks</TH>
                  <TH className="text-right whitespace-nowrap">Video Views</TH>
                  <TH className="text-right whitespace-nowrap">Eng. Rate</TH>
                </TR>
              </THead>
              <TBody>
                {pageSummaries.map((page) => {
                  const rate = page.reach > 0 ? (page.engagements / page.reach) * 100 : 0;
                  return (
                    <TR key={page.page_name}>
                      <TD className="font-medium">{page.page_name}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.image_posts)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.video_posts)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.reach)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.impressions)}</TD>
                      <TD className="text-right tabular-nums font-medium">{formatNumber(page.engagements)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.clicks)}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(page.video_views)}</TD>
                      <TD className="text-right tabular-nums text-muted-foreground">{rate.toFixed(2)}%</TD>
                    </TR>
                  );
                })}
                {pageSummaries.length === 0 && (
                  <TR><TD colSpan={9} className="text-center text-muted-foreground py-6">No page content metrics yet. Upload a content CSV above.</TD></TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-emerald-600" />
              Post-Level Content Details ({uniqueContentRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH className="whitespace-nowrap">Date</TH>
                  <TH className="w-[180px]">Page</TH>
                  <TH className="whitespace-nowrap">Type</TH>
                  <TH className="w-[260px]">Content</TH>
                  <TH className="text-right whitespace-nowrap">Reach</TH>
                  <TH className="text-right whitespace-nowrap">Impr.</TH>
                  <TH className="text-right whitespace-nowrap">Engagements</TH>
                  <TH className="text-right whitespace-nowrap">Comments</TH>
                  <TH className="text-right whitespace-nowrap">Shares</TH>
                  <TH className="text-right whitespace-nowrap">Clicks</TH>
                </TR>
              </THead>
              <TBody>
                {paginatedContentRows.map((row) => (
                  <TR key={row.id}>
                    <TD className="whitespace-nowrap text-muted-foreground text-xs">{formatDate(row.date)}</TD>
                    <TD className="font-medium">
                      <div className="max-w-[180px] truncate" title={row.page_name}>
                        {row.page_name}
                      </div>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {postTypeLabel(row.content_type) === "Video" ? <Video className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                        {postTypeLabel(row.content_type)}
                      </span>
                    </TD>
                    <TD>
                      <div className="max-w-[260px] truncate" title={row.content_title || row.content_url || ""}>
                        {row.content_url ? (
                          <a href={row.content_url} target="_blank" rel="noreferrer" className="hover:underline">
                            {row.content_title || row.content_url}
                          </a>
                        ) : (
                          row.content_title || "—"
                        )}
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{formatNumber(row.reach)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(row.impressions)}</TD>
                    <TD className="text-right tabular-nums font-medium">{formatNumber(row.engagements)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(row.comments)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(row.shares)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(row.clicks)}</TD>
                  </TR>
                ))}
                {uniqueContentRows.length === 0 && (
                  <TR><TD colSpan={10} className="text-center text-muted-foreground py-6">No content rows yet for this date range.</TD></TR>
                )}
              </TBody>
            </Table>
            {uniqueContentRows.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {formatNumber(pageStart)}-{formatNumber(pageEnd)} of {formatNumber(uniqueContentRows.length)}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={pageHref(contentPage - 1)}
                    aria-disabled={contentPage <= 1}
                    className={`rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium ${contentPage <= 1 ? "pointer-events-none text-slate-300" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    Previous
                  </Link>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                    {contentPage} / {contentPageCount}
                  </span>
                  <Link
                    href={pageHref(contentPage + 1)}
                    aria-disabled={contentPage >= contentPageCount}
                    className={`rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium ${contentPage >= contentPageCount ? "pointer-events-none text-slate-300" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    Next
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      <details className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800">
          <FileUp className="h-5 w-5 text-slate-500" />
          Import CSV Data
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">optional</span>
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload paid campaign exports or page content exports when you want to refresh this report.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FbCsvUploader />
          <FbContentCsvUploader />
        </div>
      </details>
      </div>
  );
}
