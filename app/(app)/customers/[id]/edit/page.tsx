import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id,name,phone,address")
    .eq("id", params.id)
    .single();

  if (!customer) notFound();

  const saveCustomer = updateCustomer.bind(null, customer.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit customer</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.name}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/customers">Back to customers</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer details</CardTitle></CardHeader>
        <CardContent>
          <form action={saveCustomer} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={customer.name} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={customer.phone || ""} />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" defaultValue={customer.address || ""} />
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 md:col-span-2 sm:flex-row">
              <Button type="submit" className="w-full sm:w-auto">Update customer</Button>
              <Button asChild variant="ghost" className="w-full sm:w-auto">
                <Link href="/customers">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
