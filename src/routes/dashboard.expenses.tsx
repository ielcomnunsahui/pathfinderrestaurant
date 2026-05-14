import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatNaira, formatDate } from "@/lib/format";
import { generatePdf, printPage } from "@/lib/pdf";

export const Route = createFileRoute("/dashboard/expenses")({ component: ExpensesPage });

const CATS = ["Rent","Utilities","Salaries","Inventory Purchase","Maintenance","Marketing","Transport","Other"];

function ExpensesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Other", description: "", amount: 0, expense_date: new Date().toISOString().slice(0,10) });

  const list = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(200)).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("expenses").insert({ ...form, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense logged");
      setOpen(false);
      setForm({ category: "Other", description: "", amount: 0, expense_date: new Date().toISOString().slice(0,10) });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (list.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const exportPdf = () => generatePdf({
    title: "Expenses Report",
    columns: ["Date", "Category", "Description", "Amount"],
    rows: (list.data ?? []).map((e: any) => [formatDate(e.expense_date), e.category, e.description, formatNaira(Number(e.amount))]),
    totals: [{ label: "Total", value: formatNaira(total) }],
    filename: "expenses.pdf",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track operational costs and outflows.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => printPage()}><Printer className="mr-1 h-4 w-4"/>Print</Button>
        <Button variant="outline" onClick={exportPdf}><FileDown className="mr-1 h-4 w-4"/>PDF</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4" />Log Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({...form, expense_date: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><Label>Amount (₦)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: Number(e.target.value)})} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={() => create.mutate()} disabled={create.isPending || !form.description || !form.amount}>{create.isPending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All expenses</CardTitle>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Total logged</div>
            <div className="font-display text-xl font-bold">{formatNaira(total)}</div>
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           (list.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-40" /><p>No expenses yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.data?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(e.expense_date)}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell className="max-w-md truncate">{e.description}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNaira(Number(e.amount))}</TableCell>
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
