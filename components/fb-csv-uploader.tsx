"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bulkInsertFbInsights } from "@/lib/actions";

// Normalize common Facebook Ads Manager export column names to our schema
const FIELD_MAP: Record<string, string> = {
  "campaign name": "campaign_name",
  "campaign_name": "campaign_name",
  "day": "date",
  "date": "date",
  "reporting starts": "date",
  "reporting ends": "date_end",
  "amount spent (usd)": "spend",
  "amount spent": "spend",
  "spend": "spend",
  "reach": "reach",
  "impressions": "impressions",
  "link clicks": "clicks",
  "clicks (all)": "clicks",
  "clicks": "clicks",
  "leads": "leads",
  "results": "leads",
};

function normalizeRow(raw: Record<string, any>) {
  const out: any = {};
  for (const [key, val] of Object.entries(raw)) {
    const k = FIELD_MAP[key.trim().toLowerCase()];
    if (k) out[k] = val;
  }
  return out;
}

export function FbCsvUploader() {
  const router = useRouter();
  const [preview, setPreview] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    setStatus(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const all = (res.data as any[]).map(normalizeRow).filter((r) => r.date);
        // Only keep campaigns that actually spent money
        const rows = all.filter((r) => Number(r.spend || 0) > 0);
        const skipped = all.length - rows.length;
        setPreview(rows);
        setStatus(
          `${rows.length} campaigns with spend detected` +
          (skipped > 0 ? ` (skipped ${skipped} zero-spend rows).` : ".")
        );
      },
      error: (err) => setStatus("Parse error: " + err.message),
    });
  }

  async function importRows() {
    setLoading(true);
    try {
      const n = await bulkInsertFbInsights(preview);
      setStatus(`Imported ${n} rows.`);
      setPreview([]);
      router.refresh();
    } catch (e: any) {
      setStatus("Error: " + (e.message || "failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paid Campaign CSV</CardTitle>
        <CardDescription>Use an Ads Manager report with Campaign name, Date, Amount spent, Reach, Impressions, Clicks, and Results/Leads.</CardDescription>
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
                <thead className="bg-muted"><tr><th className="p-2 text-left">Start</th><th className="p-2 text-left">End</th><th className="p-2 text-left">Campaign</th><th className="p-2 text-right">Spend</th><th className="p-2 text-right">Leads</th></tr></thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t"><td className="p-2">{r.date}</td><td className="p-2">{r.date_end || "—"}</td><td className="p-2">{r.campaign_name || "—"}</td><td className="p-2 text-right">{r.spend || 0}</td><td className="p-2 text-right">{r.leads || 0}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={importRows} disabled={loading}>{loading ? "Importing..." : `Import ${preview.length} rows`}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
