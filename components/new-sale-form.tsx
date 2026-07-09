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
import { createSale, updateSale } from "@/lib/actions";
import { Trash2, Plus, Save } from "lucide-react";

type DeliveryFeePayer = "customer" | "company";
type Product = {
  id: string;
  name: string;
  price: number;
  delivery_fee: number | string | null;
  delivery_company_min_qty: number | string | null;
};
type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};
type Item = {
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  delivery_fee?: number;
  delivery_fee_payer?: DeliveryFeePayer;
};
type InitialSale = {
  id: string;
  sale_date: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  channel: string | null;
  discount: number | string | null;
  payment_status: string | null;
  note: string | null;
};

export function NewSaleForm({
  products,
  customers,
  initialSale,
  initialItems,
}: {
  products: Product[];
  customers: Customer[];
  initialSale?: InitialSale;
  initialItems?: Item[];
}) {
  const router = useRouter();
  const isEditing = Boolean(initialSale);
  const [items, setItems] = useState<Item[]>(
    initialItems?.length
      ? initialItems.map((item) => ({
          product_id: item.product_id || null,
          product_name: item.product_name || "",
          qty: Number(item.qty || 0),
          unit_price: Number(item.unit_price || 0),
          delivery_fee: Number(item.delivery_fee || 0),
          delivery_fee_payer: item.delivery_fee_payer === "company" ? "company" : "customer",
        }))
      : [{ product_id: null, product_name: "", qty: 1, unit_price: 0 }]
  );
  const [saleDate, setSaleDate] = useState(initialSale?.sale_date || toISODate(new Date()));
  const [customerId, setCustomerId] = useState(initialSale?.customer_id || "");
  const [customer, setCustomer] = useState(initialSale?.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(initialSale?.customer_phone || "");
  const [customerAddress, setCustomerAddress] = useState(initialSale?.customer_address || "");
  const [channel, setChannel] = useState(initialSale?.channel || "Facebook");
  const [discount, setDiscount] = useState(Number(initialSale?.discount || 0));
  const [status, setStatus] = useState(initialSale?.payment_status || "paid");
  const [note, setNote] = useState(initialSale?.note || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function deliveryForItem(item: Item) {
    return {
      fee: Math.max(0, Number(item.delivery_fee || 0)),
      payer: item.delivery_fee_payer === "company" ? "company" : "customer",
    };
  }

  function defaultDeliveryPayer(product: Product, qty: number): DeliveryFeePayer {
    const companyMinQty = product.delivery_company_min_qty == null ? null : Number(product.delivery_company_min_qty);
    return Number(product.delivery_fee || 0) > 0 && companyMinQty != null && qty >= companyMinQty
      ? "company"
      : "customer";
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const delivery = items.reduce(
    (totals, item) => {
      const rule = deliveryForItem(item);
      if (rule.payer === "company") totals.company += rule.fee;
      else totals.customer += rule.fee;
      return totals;
    },
    { customer: 0, company: 0 }
  );
  const total = Math.max(0, subtotal + delivery.customer - discount);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    const currentQty = items[idx]?.qty || 1;
    if (p) {
      updateItem(idx, {
        product_id: p.id,
        product_name: p.name,
        unit_price: Number(p.price),
        delivery_fee: Number(p.delivery_fee || 0),
        delivery_fee_payer: defaultDeliveryPayer(p, currentQty),
      });
    }
    else updateItem(idx, { product_id: null, delivery_fee: 0, delivery_fee_payer: "customer" });
  }

  function selectCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const selected = customers.find((x) => x.id === nextCustomerId);
    if (!selected) return;
    setCustomer(selected.name);
    setCustomerPhone(selected.phone || "");
    setCustomerAddress(selected.address || "");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const cleanItems = items.filter((i) => i.product_name && i.qty > 0);
      if (cleanItems.length === 0) throw new Error("Add at least one item");
      const payload = {
        sale_date: saleDate,
        customer_id: customerId || null,
        customer_name: customer,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        channel,
        discount,
        payment_status: status,
        note,
        items: cleanItems,
      };
      if (initialSale) await updateSale(initialSale.id, payload);
      else await createSale(payload);
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
        <CardHeader><CardTitle>{isEditing ? "Edit details" : "Details"}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Date</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div>
            <Label>Saved customer</Label>
            <Select value={customerId} onChange={(e) => selectCustomer(e.target.value)}>
              <option value="">— New customer —</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
          </div>
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
          <div><Label>Customer name</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Address</Label><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-12 sm:items-end sm:border-0 sm:p-0">
              <div className="col-span-2 sm:col-span-2">
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
              <div className="col-span-1 sm:col-span-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="0.01" value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs">Unit price</Label>
                <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <Label className="text-xs">Delivery cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={it.delivery_fee || 0}
                  onChange={(e) => updateItem(idx, { delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <Label className="text-xs">Delivery paid by</Label>
                <Select
                  value={it.delivery_fee_payer || "customer"}
                  onChange={(e) => updateItem(idx, { delivery_fee_payer: e.target.value === "company" ? "company" : "customer" })}
                >
                  <option value="customer">Customer</option>
                  <option value="company">Company</option>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Button variant="ghost" size="icon" className="w-full sm:w-10" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { product_id: null, product_name: "", qty: 1, unit_price: 0, delivery_fee: 0, delivery_fee_payer: "customer" }])}>
            <Plus className="h-4 w-4 mr-1" />Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div><Label>Discount</Label><Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
          <div className="md:col-span-2"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="md:col-span-3 flex flex-col gap-1 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Subtotal: {formatCurrency(subtotal)}</div>
              <div>Delivery paid by customer: {formatCurrency(delivery.customer)}</div>
              <div>Delivery paid by company: {formatCurrency(delivery.company)}</div>
            </div>
            <div className="text-xl font-bold">Customer total: {formatCurrency(total)}</div>
          </div>
          {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}
          <div className="md:col-span-3">
            <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
              <Save className="mr-1 h-4 w-4" />
              {submitting ? "Saving..." : isEditing ? "Update sale" : "Save sale"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
