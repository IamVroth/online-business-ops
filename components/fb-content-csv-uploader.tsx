"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bulkInsertFbContentMetrics } from "@/lib/actions";

const FIELD_MAP: Record<string, string> = {
  "page": "page_name",
  "page name": "page_name",
  "facebook page": "page_name",
  "post": "content_title",
  "post message": "content_title",
  "post title": "content_title",
  "title": "content_title",
  "content": "content_title",
  "content title": "content_title",
  "permalink": "content_url",
  "post permalink": "content_url",
  "post url": "content_url",
  "url": "content_url",
  "post type": "content_type",
  "content type": "content_type",
  "type": "content_type",
  "date": "date",
  "posted": "date",
  "published": "date",
  "publish date": "date",
  "publish time": "date",
  "reach": "reach",
  "post reach": "reach",
  "lifetime post total reach": "reach",
  "impressions": "impressions",
  "post impressions": "impressions",
  "lifetime post total impressions": "impressions",
  "engagements": "engagements",
  "post engagements": "engagements",
  "engaged users": "engagements",
  "lifetime engaged users": "engagements",
  "reactions, comments and shares": "engagements",
  "reactions": "reactions",
  "likes": "reactions",
  "comments": "comments",
  "shares": "shares",
  "clicks": "clicks",
  "post clicks": "clicks",
  "total clicks": "clicks",
  "link clicks": "clicks",
  "video views": "video_views",
  "views": "video_views",
  "3-second video views": "video_views",
};

function inferDateFromFilename(filename: string) {
  const matches = [...filename.matchAll(/([A-Za-z]{3})-(\d{2})-(\d{4})/g)];
  const match = matches[matches.length - 1];
  if (!match) return "";
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeDate(value: unknown, fallbackDate = "") {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "lifetime") return fallbackDate;
  const iso = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallbackDate;
  return parsed.toISOString().slice(0, 10);
}

function normalizeContentType(value: unknown) {
  const raw = String(value || "").trim();
  const type = raw.toLowerCase();
  if (!type) return "";
  if (type.includes("video") || type.includes("reel")) return "Video";
  if (type.includes("photo") || type.includes("image")) return "Image";
  return raw;
}

function normalizeRow(raw: Record<string, unknown>, fallbackDate = "") {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const mappedKey = FIELD_MAP[key.trim().toLowerCase()];
    if (!mappedKey) continue;
    if (mappedKey === "date") {
      const raw = String(val || "").trim().toLowerCase();
      if ((raw === "lifetime" || raw === "") && out.date) continue;
      const normalized = normalizeDate(val, fallbackDate);
      if (normalized || !out.date) out.date = normalized;
      continue;
    }
    if (mappedKey === "content_type") {
      out[mappedKey] = normalizeContentType(val);
      continue;
    }
    out[mappedKey] = val;
  }
  return out;
}

function importedDateRange(rows: Record<string, unknown>[]) {
  const dates = rows.map((row) => String(row.date || "")).filter(Boolean).sort();
  return {
    from: dates[0],
    to: dates[dates.length - 1],
  };
}

function rowIdentity(row: Record<string, unknown>) {
  return [
    String(row.page_name || ""),
    String(row.date || ""),
    String(row.content_type || ""),
    String(row.content_url || row.content_title || ""),
  ].join("|");
}

export function FbContentCsvUploader() {
  const router = useRouter();
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    setStatus(null);
    const fallbackDate = inferDateFromFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, unknown>[])
          .map((row) => normalizeRow(row, fallbackDate))
          .filter((r) => r.date && r.page_name);
        const uniqueRows = Object.values(
          rows.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
            const key = rowIdentity(row);
            if (!acc[key]) acc[key] = row;
            return acc;
          }, {})
        );
        setPreview(uniqueRows);
        setStatus(
          `${uniqueRows.length} unique content metric rows detected` +
          (rows.length > uniqueRows.length ? ` (${rows.length - uniqueRows.length} duplicate rows skipped)` : "") +
          (fallbackDate ? ` using ${fallbackDate} for Lifetime rows.` : ".")
        );
      },
      error: (err) => setStatus("Parse error: " + err.message),
    });
  }

  async function importRows() {
    setLoading(true);
    try {
      const count = await bulkInsertFbContentMetrics(preview as Parameters<typeof bulkInsertFbContentMetrics>[0]);
      setStatus(`Imported ${count} content metric rows.`);
      const range = importedDateRange(preview);
      setPreview([]);
      if (range.from && range.to) {
        router.push(`/facebook?from=${range.from}&to=${range.to}`);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      setStatus("Import failed: " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Content CSV</CardTitle>
        <CardDescription>
          Use a Page/Post export with Page name, Content, Date, Reach, Impressions, Engagements, Comments, Shares, Clicks, or Video views.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block text-sm"
        />
        {status && <p className="text-sm">{status}</p>}
        {preview.length > 0 && (
          <>
            <div className="max-h-48 overflow-auto border rounded-md text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Page</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Content</th>
                    <th className="p-2 text-right">Reach</th>
                    <th className="p-2 text-right">Engagements</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{String(row.date || "")}</td>
                      <td className="p-2">{String(row.page_name || "")}</td>
                      <td className="p-2">{String(row.content_type || "—")}</td>
                      <td className="p-2">{String(row.content_title || "—")}</td>
                      <td className="p-2 text-right">{String(row.reach || 0)}</td>
                      <td className="p-2 text-right">{String(row.engagements || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={importRows} disabled={loading}>
              {loading ? "Importing..." : `Import ${preview.length} rows`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
