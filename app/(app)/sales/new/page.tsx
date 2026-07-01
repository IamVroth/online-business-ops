import { createClient } from "@/lib/supabase/server";
import { NewSaleForm } from "@/components/new-sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const supabase = createClient();
  const { data: products } = await supabase.from("products").select("id, name, price").eq("active", true).order("name");
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">New sale</h1>
      <NewSaleForm products={products || []} />
    </div>
  );
}
