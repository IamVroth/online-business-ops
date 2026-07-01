"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, toISODate } from "@/lib/utils";
import { createSale } from "@/lib/actions";
import { Trash2, Plus } from "lucide-react";

type Product = { id: string; name: string; price: number };
type Item = { product_id: string | null; product_name: string; qty: number; unit_price: number };

export function NewSaleForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([{ product_id: null, product_name: "", qty: 1, unit_price: 0 }]);
  const [saleDate, setSaleDate] = useState(toISODate(new Date()));
  const [customer, setCustomer] = useState("");
  const [channel, setChannel] = useState("Facebook");
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState("paid");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) updateItem(idx, { product_id: p.id, product_name: p.name, unit_price: Number(p.price) });
    else updateItem(idx, { product_id: null });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const cleanItems = items.filter((i) => i.product_name && i.qty > 0);
      if (cleanItems.length === 0) throw new Error("Add at least one item");
      await createSale({
        sale_date: saleDate,
        customer_name: customer,
        channel,
        discount,
        payment_status: status,
        note,
        items: cleanItems,
      });
      router.push("/sales");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to save");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Date</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div><Label>Customer</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
          <div><Label>Channel</Label>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option>Facebook</option><option>Instagram</option><option>TikTok</option>
              <option>Website</option><option>Walk-in</option><option>Other</option>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="paid">Paid</option><option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-12 sm:items-end sm:border-0 sm:p-0">
              <div className="col-span-2 sm:col-span-4">
                <Label className="text-xs">Product</Label>
                <Select value={it.product_id || ""} onChange={(e) => selectProduct(idx, e.target.value)}>
                  <option value="">— Custom —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-xs">Name</Label>
                <Input value={it.product_name} onChange={(e) => updateItem(idx, { product_name: e.target.value })} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="0.01" value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs">Unit price</Label>
                <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Button variant="ghost" size="icon" className="w-full sm:w-10" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { product_id: null, product_name: "", qty: 1, unit_price: 0 }])}>
            <Plus className="h-4 w-4 mr-1" />Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div><Label>Discount</Label><Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
          <div className="md:col-span-2"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="md:col-span-3 flex flex-col gap-1 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</div>
            <div className="text-xl font-bold">Total: {formatCurrency(total)}</div>
          </div>
          {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}
          <div className="md:col-span-3">
            <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">{submitting ? "Saving..." : "Save sale"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
