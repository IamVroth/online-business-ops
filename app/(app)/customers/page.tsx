import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createCustomer, deleteCustomer } from "@/lib/actions";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,phone,address,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers</h1>

      <Card>
        <CardHeader><CardTitle>New customer</CardTitle></CardHeader>
        <CardContent>
          <form action={createCustomer} className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
            <div className="md:col-span-2"><Label>Name</Label><Input name="name" required /></div>
            <div><Label>Phone</Label><Input name="phone" /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input name="address" /></div>
            <div><Button type="submit" className="w-full">Add customer</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All customers ({customers?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Phone</TH><TH>Address</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(customers || []).map((customer) => (
                <TR key={customer.id}>
                  <TD className="font-medium">{customer.name}</TD>
                  <TD>{customer.phone || "—"}</TD>
                  <TD>{customer.address || "—"}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/customers/${customer.id}/edit`}><Pencil className="mr-1 h-4 w-4" />Edit</Link>
                      </Button>
                      <form action={async () => { "use server"; await deleteCustomer(customer.id); }}>
                        <Button variant="ghost" size="sm" type="submit">Delete</Button>
                      </form>
                    </div>
                  </TD>
                </TR>
              ))}
              {(!customers || customers.length === 0) && (
                <TR><TD colSpan={4} className="text-center text-muted-foreground py-6">No customers yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
