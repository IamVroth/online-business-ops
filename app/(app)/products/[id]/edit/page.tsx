import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,name,sku,price,category,active")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  const saveProduct = updateProduct.bind(null, product.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit product</h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.name}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/products">Back to products</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveProduct} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={product.name} required />
            </div>
            <div>
              <Label>SKU</Label>
              <Input name="sku" defaultValue={product.sku || ""} />
            </div>
            <div>
              <Label>Price</Label>
              <Input name="price" type="number" step="0.01" defaultValue={Number(product.price || 0)} required />
            </div>
            <div>
              <Label>Category</Label>
              <Input name="category" defaultValue={product.category || ""} />
            </div>
            <label className="flex h-10 items-center gap-2 self-end rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <input type="checkbox" name="active" defaultChecked={product.active} />
              Active product
            </label>
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 md:col-span-2 sm:flex-row">
              <Button type="submit" className="w-full sm:w-auto">Update product</Button>
              <Button asChild variant="ghost" className="w-full sm:w-auto">
                <Link href="/products">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
