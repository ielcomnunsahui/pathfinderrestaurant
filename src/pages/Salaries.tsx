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
import { Badge } from "@/components/ui/badge";
import { Plus, FileDown, Printer, Wallet, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatNaira, formatDate } from "@/lib/format";
import { generatePdf, printPage } from "@/lib/pdf";
import { RoleGuard } from "@/components/auth/RoleGuard";


function monthKey(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

function SalariesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", base_salary: 0, bonus: 0, deductions: 0, notes: "" });
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, number>>({});

  const profiles = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, default_salary, is_active").order("full_name")).data ?? [],
  });

  const salaries = useQuery({
    queryKey: ["salaries", month],
    queryFn: async () => (await supabase.from("staff_salaries").select("*").eq("month", month)).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_salaries").upsert({ ...form, month }, { onConflict: "user_id,month" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingId ? "Salary updated" : "Salary recorded");
      setOpen(false); setEditingId(null);
      setForm({ user_id: "", base_salary: 0, bonus: 0, deductions: 0, notes: "" });
      qc.invalidateQueries({ queryKey: ["salaries", month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePaid = useMutation({
    mutationFn: async (s: { id: string; status: "paid" | "unpaid" }) => {
      const { error } = await supabase.from("staff_salaries").update({
        status: s.status, paid_at: s.status === "paid" ? new Date().toISOString() : null,
      }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salaries", month] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMonth = useMutation({
    mutationFn: async () => {
      const active = (profiles.data ?? []).filter((p) => p.is_active);
      if (active.length === 0) throw new Error("No active staff to generate salaries for.");
      const existing = new Set((salaries.data ?? []).map((s) => s.user_id));
      const rows = active
        .filter((p) => !existing.has(p.id))
        .map((p) => ({ user_id: p.id, month, base_salary: Number(p.default_salary ?? 0), bonus: 0, deductions: 0, status: "unpaid" }));
      if (rows.length === 0) throw new Error("All active staff already have a salary entry for this month.");
      const { error } = await supabase.from("staff_salaries").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => { toast.success(`Generated ${count} salary record(s) for ${formatDate(month)}`); qc.invalidateQueries({ queryKey: ["salaries", month] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDefaults = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(defaults).filter(([, v]) => Number.isFinite(v));
      for (const [id, v] of updates) {
        const { error } = await supabase.from("profiles").update({ default_salary: v }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Default salaries saved"); setDefaultsOpen(false); qc.invalidateQueries({ queryKey: ["profiles-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ user_id: s.user_id, base_salary: Number(s.base_salary), bonus: Number(s.bonus), deductions: Number(s.deductions), notes: s.notes ?? "" });
    setOpen(true);
  };

  const rows = (salaries.data ?? []).map((s) => {
    const p = profiles.data?.find((x) => x.id === s.user_id);
    const net = Number(s.base_salary) + Number(s.bonus) - Number(s.deductions);
    return { ...s, name: p?.full_name ?? s.user_id.slice(0, 8), net };
  });
  const totalNet = rows.reduce((a, b) => a + b.net, 0);
  const totalPaid = rows.filter((r) => r.status === "paid").reduce((a, b) => a + b.net, 0);

  const exportPdf = () => {
    generatePdf({
      title: "Payroll Report",
      subtitle: `Month: ${formatDate(month)}`,
      columns: ["Staff", "Base", "Bonus", "Deductions", "Net", "Status"],
      rows: rows.map((r) => [r.name, formatNaira(Number(r.base_salary)), formatNaira(Number(r.bonus)), formatNaira(Number(r.deductions)), formatNaira(r.net), r.status.toUpperCase()]),
      totals: [{ label: "Total Net", value: formatNaira(totalNet) }, { label: "Total Paid", value: formatNaira(totalPaid) }, { label: "Outstanding", value: formatNaira(totalNet - totalPaid) }],
      filename: `payroll-${month}.pdf`,
    });
  };

  const openDefaults = () => {
    const seed: Record<string, number> = {};
    (profiles.data ?? []).forEach((p) => { seed[p.id] = Number(p.default_salary ?? 0); });
    setDefaults(seed);
    setDefaultsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Salaries & Payroll</h1>
          <p className="text-sm text-muted-foreground">Set staff salaries, record monthly payroll, and mark payments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="month" value={month.slice(0, 7)} onChange={(e) => setMonth(`${e.target.value}-01`)} className="h-10 w-[160px]" />
          <Button variant="outline" onClick={() => printPage()}><Printer className="mr-1 h-4 w-4"/>Print</Button>
          <Button variant="outline" onClick={exportPdf}><FileDown className="mr-1 h-4 w-4"/>PDF</Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={openDefaults}><Settings2 className="mr-1 h-4 w-4"/>Set salaries</Button>
              <Button variant="outline" onClick={() => generateMonth.mutate()} disabled={generateMonth.isPending}>
                <Sparkles className="mr-1 h-4 w-4"/>Generate month
              </Button>
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm({ user_id: "", base_salary: 0, bonus: 0, deductions: 0, notes: "" }); } }}>
                <DialogTrigger asChild><Button variant="hero"><Plus className="mr-1 h-4 w-4"/>Record</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingId ? "Edit salary" : "Record salary"} — {formatDate(month)}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Staff</Label>
                      <Select value={form.user_id} onValueChange={(v) => {
                        const p = profiles.data?.find((x) => x.id === v);
                        setForm({ ...form, user_id: v, base_salary: form.base_salary || Number(p?.default_salary ?? 0) });
                      }} disabled={!!editingId}>
                        <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>{profiles.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2"><Label>Base (₦)</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>Bonus (₦)</Label><Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>Deductions (₦)</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2 text-sm">Net: <span className="font-semibold">{formatNaira(form.base_salary + form.bonus - form.deductions)}</span></div>
                    <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="hero" onClick={() => upsert.mutate()} disabled={!form.user_id || upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Payroll</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatNaira(totalNet)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-500">{formatNaira(totalPaid)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{formatNaira(totalNet - totalPaid)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Salaries — {formatDate(month)}</CardTitle></CardHeader>
        <CardContent>
          {salaries.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Wallet className="h-10 w-10 opacity-40"/>
              <p>No salaries recorded for this month.</p>
              {isAdmin && <Button variant="hero" onClick={() => generateMonth.mutate()} disabled={generateMonth.isPending}><Sparkles className="mr-1 h-4 w-4"/>Generate from defaults</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Base</TableHead><TableHead>Bonus</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{formatNaira(Number(r.base_salary))}</TableCell>
                      <TableCell>{formatNaira(Number(r.bonus))}</TableCell>
                      <TableCell>{formatNaira(Number(r.deductions))}</TableCell>
                      <TableCell className="font-semibold">{formatNaira(r.net)}</TableCell>
                      <TableCell>{r.status === "paid" ? <Badge>Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</TableCell>
                      <TableCell>
                        {isAdmin && (
                          <div className="flex gap-1">
                            {r.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>}
                            <Button size="sm" variant="ghost" onClick={() => togglePaid.mutate({ id: r.id, status: r.status === "paid" ? "unpaid" : "paid" })}>
                              Mark {r.status === "paid" ? "unpaid" : "paid"}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={defaultsOpen} onOpenChange={setDefaultsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set default monthly salary per staff</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Used when generating a new month's payroll. You can still edit individual amounts before marking paid.</p>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {(profiles.data ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1 truncate text-sm">{p.full_name ?? p.id.slice(0,8)}</div>
                <Input type="number" className="w-40" value={defaults[p.id] ?? 0} onChange={(e) => setDefaults({ ...defaults, [p.id]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDefaultsOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={() => saveDefaults.mutate()} disabled={saveDefaults.isPending}>{saveDefaults.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalariesRoute() {
  return <RoleGuard allow={["admin"]}><SalariesPage /></RoleGuard>;
}