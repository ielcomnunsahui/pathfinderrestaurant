import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Pencil, Printer, FileDown, Trash2, Tag, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/lib/format";
import { generatePdf, printPage } from "@/lib/pdf";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/inventory")({ component: InventoryPage });

type FormState = {
  name: string; sku: string; category_id: string; unit: string;
  current_stock: number; reorder_level: number;
  cost_price: number; selling_price: number;
  pack_size: number; pack_cost: number; pack_unit: string;
};

const emptyForm: FormState = {
  name: "", sku: "", category_id: "", unit: "unit",
  current_stock: 0, reorder_level: 10,
  cost_price: 0, selling_price: 0,
  pack_size: 0, pack_cost: 0, pack_unit: "",
};

function InventoryPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole("manager") || hasRole("admin");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const cats = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });

  const inv = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const [{ data: items, error }, { data: soldRows }] = await Promise.all([
        supabase.from("inventory_items").select("*, categories(name)").order("name"),
        supabase.from("sale_items").select("item_id, quantity"),
      ]);
      if (error) throw error;
      const sold = new Map<string, number>();
      (soldRows ?? []).forEach((row) => {
        if (row.item_id) sold.set(row.item_id, (sold.get(row.item_id) ?? 0) + Number(row.quantity));
      });
      return (items ?? []).map((item) => ({ ...item, sold_quantity: sold.get(item.id) ?? 0 }));
    },
  });

  // Auto-derive cost_price from pack info if provided
  const derivedUnitCost = useMemo(() => {
    if (form.pack_size > 0 && form.pack_cost > 0) return form.pack_cost / form.pack_size;
    return form.cost_price;
  }, [form.pack_size, form.pack_cost, form.cost_price]);

  const profitMargin = useMemo(() => {
    if (form.selling_price <= 0) return 0;
    return ((form.selling_price - derivedUnitCost) / form.selling_price) * 100;
  }, [form.selling_price, derivedUnitCost]);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error("Only managers can change inventory items.");
      const cost_price = form.pack_size > 0 && form.pack_cost > 0
        ? form.pack_cost / form.pack_size
        : form.cost_price;
      const payload = {
        name: form.name,
        sku: form.sku || null,
        category_id: form.category_id || null,
        unit: form.unit,
        current_stock: form.current_stock,
        reorder_level: form.reorder_level,
        cost_price,
        selling_price: form.selling_price,
        pack_size: form.pack_size > 0 ? form.pack_size : null,
        pack_cost: form.pack_cost > 0 ? form.pack_cost : null,
        pack_unit: form.pack_unit || null,
      };
      if (editing) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Item updated" : "Item added");
      setOpen(false); setEditing(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inv-active"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (inv.data ?? []).filter((i: any) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!canManage) throw new Error("Only managers can delete inventory items.");
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item deleted"); qc.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCat = useMutation({
    mutationFn: async () => {
      const name = newCatName.trim();
      if (!name) throw new Error("Enter a category name");
      const { error } = await supabase.from("categories").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setNewCatName(""); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCat = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Category removed"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportPdf = () => generatePdf({
    title: "Inventory Report",
    columns: ["Product Name", "Category", "Cost Price", "Sell Price", "Profit Margin", "In Stock", "Sold", "Min Level", "Status"],
    rows: filtered.map((i: any) => {
      const margin = Number(i.selling_price) > 0 ? ((Number(i.selling_price) - Number(i.cost_price)) / Number(i.selling_price)) * 100 : 0;
      const status = !i.is_active ? "Inactive" : Number(i.current_stock) <= 0 ? "Out" : Number(i.current_stock) <= Number(i.reorder_level) ? "Low" : "Healthy";
      return [i.name, i.categories?.name || "—", formatNaira(i.cost_price), formatNaira(i.selling_price), `${margin.toFixed(1)}%`, `${Number(i.current_stock)} ${i.unit}`, Number(i.sold_quantity), `${Number(i.reorder_level)} ${i.unit}`, status];
    }),
    filename: "inventory.pdf",
  });

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name, sku: item.sku || "", category_id: item.category_id || "", unit: item.unit,
      current_stock: Number(item.current_stock), reorder_level: Number(item.reorder_level),
      cost_price: Number(item.cost_price), selling_price: Number(item.selling_price),
      pack_size: Number(item.pack_size ?? 0), pack_cost: Number(item.pack_cost ?? 0),
      pack_unit: item.pack_unit ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels, prices, margins, and reorder points.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/inventory-analytics"><BarChart3 className="mr-1 h-4 w-4"/>Analytics</Link></Button>
          <Button variant="outline" onClick={() => printPage()}><Printer className="mr-1 h-4 w-4"/>Print</Button>
          <Button variant="outline" onClick={exportPdf}><FileDown className="mr-1 h-4 w-4"/>PDF</Button>
          {canManage && (
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild><Button variant="outline"><Tag className="mr-1 h-4 w-4"/>Categories</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Manage categories</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="New category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    <Button onClick={() => addCat.mutate()} disabled={addCat.isPending || !newCatName.trim()}>Add</Button>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto rounded border">
                    {(cats.data ?? []).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between border-b px-3 py-2 last:border-0">
                        <span className="text-sm">{c.name}</span>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remove ${c.name}?`)) delCat.mutate(c.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {cats.data?.length === 0 && <p className="p-3 text-sm text-muted-foreground">No categories yet.</p>}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canManage && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4" />Add Item</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>{editing ? "Edit item" : "Add inventory item"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1 -mr-1 flex-1">
                  <div className="col-span-2 space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Selling unit (e.g. cup, plate, kg)</Label><Input value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} /></div>
                  <div className="col-span-2 space-y-2"><Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{cats.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Current stock</Label><Input type="number" value={form.current_stock} onChange={(e) => setForm({...form, current_stock: Number(e.target.value)})} /></div>
                  <div className="space-y-2"><Label>Reorder level (min)</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({...form, reorder_level: Number(e.target.value)})} /></div>

                  <div className="col-span-2 mt-2 rounded-lg border bg-muted/40 p-3">
                    <div className="mb-2 text-sm font-semibold">Bulk purchase (optional)</div>
                    <p className="mb-3 text-xs text-muted-foreground">For items bought in packs/sacks (e.g. bag of rice). Unit cost is auto-calculated.</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2"><Label>Pack name</Label><Input placeholder="e.g. bag, sack" value={form.pack_unit} onChange={(e) => setForm({...form, pack_unit: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Pack cost (₦)</Label><Input type="number" value={form.pack_cost} onChange={(e) => setForm({...form, pack_cost: Number(e.target.value)})} /></div>
                      <div className="space-y-2"><Label>Units per pack</Label><Input type="number" value={form.pack_size} onChange={(e) => setForm({...form, pack_size: Number(e.target.value)})} /></div>
                    </div>
                  </div>

                  <div className="space-y-2"><Label>Cost price / unit (₦)</Label>
                    <Input type="number" value={form.pack_size > 0 && form.pack_cost > 0 ? derivedUnitCost.toFixed(2) : form.cost_price}
                      disabled={form.pack_size > 0 && form.pack_cost > 0}
                      onChange={(e) => setForm({...form, cost_price: Number(e.target.value)})} />
                    {form.pack_size > 0 && form.pack_cost > 0 && (
                      <p className="text-xs text-muted-foreground">Auto: {formatNaira(form.pack_cost)} ÷ {form.pack_size} = {formatNaira(derivedUnitCost)}</p>
                    )}
                  </div>
                  <div className="space-y-2"><Label>Selling price / unit (₦)</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({...form, selling_price: Number(e.target.value)})} /></div>
                  <div className="col-span-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                    Profit per unit: <span className="font-semibold">{formatNaira(Math.max(0, form.selling_price - derivedUnitCost))}</span>
                    {" · "}
                    Margin: <span className="font-semibold">{profitMargin.toFixed(1)}%</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button variant="hero" onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.name}>{upsert.isPending ? "Saving…" : "Save"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items ({filtered.length})</CardTitle>
          <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          {inv.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 opacity-40" /><p>No items found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Product Name</TableHead><TableHead>Category</TableHead><TableHead>Cost Price</TableHead><TableHead>Sell Price</TableHead><TableHead>Profit Margin</TableHead><TableHead>In Stock</TableHead><TableHead>Sold</TableHead><TableHead>Min Level</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((i: any) => {
                    const low = Number(i.current_stock) <= Number(i.reorder_level);
                    const margin = Number(i.selling_price) > 0 ? ((Number(i.selling_price) - Number(i.cost_price)) / Number(i.selling_price)) * 100 : 0;
                    const status = !i.is_active ? "Inactive" : Number(i.current_stock) <= 0 ? "Out" : low ? "Low" : "Healthy";
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell>{i.categories?.name || "—"}</TableCell>
                        <TableCell>{formatNaira(i.cost_price)}</TableCell>
                        <TableCell>{formatNaira(i.selling_price)}</TableCell>
                        <TableCell>{margin.toFixed(1)}%</TableCell>
                        <TableCell>{Number(i.current_stock)} {i.unit}</TableCell>
                        <TableCell>{Number(i.sold_quantity)}</TableCell>
                        <TableCell>{Number(i.reorder_level)} {i.unit}</TableCell>
                        <TableCell>
                          {status === "Healthy" ? <Badge variant="secondary">Healthy</Badge> : <Badge variant="destructive">{status}</Badge>}
                        </TableCell>
                        <TableCell>
                          {canManage && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${i.name}?`)) del.mutate(i.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
