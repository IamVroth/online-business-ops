import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NewSaleForm } from "@/components/new-sale-form";

export const dynamic = "force-dynamic";

export default async function EditSalePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: sale }, { data: saleItems }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id,sale_date,customer_name,channel,discount,payment_status,note")
      .eq("id", params.id)
      .single(),
    supabase
      .from("sale_items")
      .select("product_id,product_name,qty,unit_price")
      .eq("sale_id", params.id)
      .order("id", { ascending: true }),
    supabase.from("products").select("id, name, price").order("name"),
  ]);

  if (!sale) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit sale</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sale.customer_name || "Walk-in customer"} · {sale.sale_date}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/sales">Back to sales</Link>
        </Button>
      </div>

      <NewSaleForm
        products={products || []}
        initialSale={sale}
        initialItems={(saleItems || []).map((item) => ({
          product_id: item.product_id || null,
          product_name: item.product_name,
          qty: Number(item.qty || 0),
          unit_price: Number(item.unit_price || 0),
        }))}
      />
    </div>
  );
}
