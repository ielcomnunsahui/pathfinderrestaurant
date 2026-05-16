import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatNaira, formatDateTime } from "@/lib/format";
import { generatePdf, printPage } from "@/lib/pdf";
import { Badge } from "@/components/ui/badge";


interface Line { item_id: string; item_name: string; quantity: number; unit_price: number; }

function SalesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("cash");
  const [lines, setLines] = useState<Line[]>([]);

  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*, sale_items(*)").order("sold_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useQuery({
    queryKey: ["inv-active"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_items").select("id, name, selling_price, current_stock").eq("is_active", true).gt("selling_price", 0).order("name");
      return data ?? [];
    },
  });

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (lines.length === 0) throw new Error("Add at least one item");
      const { data: sale, error } = await supabase.from("sales").insert({
        user_id: user.id, customer_name: customer || null, payment_method: payment, total_amount: total,
      }).select().single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("sale_items").insert(
        lines.map((l) => ({ sale_id: sale.id, item_id: l.item_id, item_name: l.item_name, quantity: l.quantity, unit_price: l.unit_price, subtotal: l.quantity * l.unit_price }))
      );
      if (e2) throw e2;
      // Stock decrement + movement is handled automatically by the database trigger
    },
    onSuccess: () => {
      toast.success("Sale recorded");
      setOpen(false); setCustomer(""); setPayment("cash"); setLines([]);
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["inv-active"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLine = (id: string) => {
    const it = items.data?.find((i) => i.id === id);
    if (!it) return;
    setLines((prev) => [...prev, { item_id: it.id, item_name: it.name, quantity: 1, unit_price: Number(it.selling_price) }]);
  };

  const exportPdf = () => generatePdf({
    title: "Sales Report",
    columns: ["Date", "Customer", "Items", "Payment", "Total"],
    rows: (sales.data ?? []).map((s: any) => [formatDateTime(s.sold_at), s.customer_name || "Walk-in", String(s.sale_items?.length ?? 0), s.payment_method, formatNaira(Number(s.total_amount))]),
    totals: [{ label: "Total Revenue", value: formatNaira((sales.data ?? []).reduce((a: number, b: any) => a + Number(b.total_amount), 0)) }],
    filename: "sales.pdf",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Record orders and track revenue.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => printPage()}><Printer className="mr-1 h-4 w-4"/>Print</Button>
        <Button variant="outline" onClick={exportPdf}><FileDown className="mr-1 h-4 w-4"/>PDF</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4"/> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Record a sale</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Customer (optional)</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" /></div>
                <div className="space-y-2"><Label>Payment method</Label>
                  <Select value={payment} onValueChange={setPayment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                      <SelectItem value="pos">POS / Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Add item</Label>
                <Select onValueChange={addLine} value="">
                  <SelectTrigger><SelectValue placeholder="Select item to add" /></SelectTrigger>
                  <SelectContent>
                    {items.data?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name} — {formatNaira(Number(i.selling_price))}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lines.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell>{l.item_name}</TableCell>
                          <TableCell><Input type="number" min={1} className="h-8 w-20" value={l.quantity} onChange={(e) => { const v = Number(e.target.value); setLines((p) => p.map((x, idx) => idx===i?{...x, quantity:v}:x)); }} /></TableCell>
                          <TableCell><Input type="number" className="h-8 w-28" value={l.unit_price} onChange={(e) => { const v = Number(e.target.value); setLines((p) => p.map((x, idx) => idx===i?{...x, unit_price:v}:x)); }} /></TableCell>
                          <TableCell>{formatNaira(l.quantity * l.unit_price)}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4"/></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-bold">{formatNaira(total)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Record sale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent sales</CardTitle></CardHeader>
        <CardContent>
          {sales.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           (sales.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-40" />
              <p>No sales recorded yet.</p>
            </div>
           ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sales.data?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(s.sold_at)}</TableCell>
                      <TableCell>{s.customer_name || "Walk-in"}</TableCell>
                      <TableCell>{s.sale_items?.length ?? 0}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{s.payment_method}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatNaira(Number(s.total_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SalesPage;
