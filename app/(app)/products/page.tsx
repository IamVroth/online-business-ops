import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createProduct, deleteProduct } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id,name,sku,category,price,delivery_fee,delivery_company_min_qty,active")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products</h1>

      <Card>
        <CardHeader><CardTitle>New product</CardTitle></CardHeader>
        <CardContent>
          <form action={createProduct} className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
            <div className="md:col-span-2"><Label>Name</Label><Input name="name" required /></div>
            <div><Label>SKU</Label><Input name="sku" /></div>
            <div><Label>Price</Label><Input name="price" type="number" step="0.01" defaultValue="0" required /></div>
            <div><Label>Category</Label><Input name="category" /></div>
            <div><Label>Delivery fee</Label><Input name="delivery_fee" type="number" step="0.01" defaultValue="0" /></div>
            <div><Label>Company pays from qty</Label><Input name="delivery_company_min_qty" type="number" step="0.01" placeholder="e.g. 5" /></div>
            <div className="md:col-span-6"><Button type="submit" className="w-full sm:w-auto">Add product</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All products ({products?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>SKU</TH><TH>Category</TH><TH>Status</TH><TH className="text-right">Price</TH><TH className="text-right">Delivery</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(products || []).map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-muted-foreground">{p.sku || "—"}</TD>
                  <TD>{p.category || "—"}</TD>
                  <TD>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </TD>
                  <TD className="text-right">{formatCurrency(p.price)}</TD>
                  <TD className="text-right">
                    <div>{formatCurrency(p.delivery_fee || 0)}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.delivery_company_min_qty ? `Company from ${Number(p.delivery_company_min_qty)}` : "Customer pays"}
                    </div>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/products/${p.id}/edit`}><Pencil className="mr-1 h-4 w-4" />Edit</Link>
                      </Button>
                      <form action={async () => { "use server"; await deleteProduct(p.id); }}>
                        <Button variant="ghost" size="sm" type="submit">Delete</Button>
                      </form>
                    </div>
                  </TD>
                </TR>
              ))}
              {(!products || products.length === 0) && (
                <TR><TD colSpan={7} className="text-center text-muted-foreground py-6">No products yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
