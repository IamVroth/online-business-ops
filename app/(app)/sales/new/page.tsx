import { createClient } from "@/lib/supabase/server";
import { NewSaleForm } from "@/components/new-sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const supabase = createClient();
  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price, delivery_fee, delivery_company_min_qty")
      .eq("active", true)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name, phone, address")
      .order("name"),
  ]);
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">New sale</h1>
      <NewSaleForm products={products || []} customers={customers || []} />
    </div>
  );
}
