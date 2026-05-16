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
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatNaira, formatDate } from "@/lib/format";
import { RoleGuard } from "@/components/auth/RoleGuard";


function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; }

function GoalsPage() {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole("admin");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period: "annual" as "4m" | "6m" | "annual", target_revenue: 0, notes: "" });

  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await supabase.from("business_goals").select("*").order("start_date", { ascending: false })).data ?? [],
  });

  const sales = useQuery({
    queryKey: ["sales-all-for-goals"],
    queryFn: async () => (await supabase.from("sales").select("total_amount, sold_at")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const months = form.period === "4m" ? 4 : form.period === "6m" ? 6 : 12;
      const end = addMonths(start, months);
      const { error } = await supabase.from("business_goals").insert({
        period: form.period, start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10),
        target_revenue: form.target_revenue, notes: form.notes, created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal created");
      setOpen(false); setForm({ period: "annual", target_revenue: 0, notes: "" });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("business_goals").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const progressFor = (g: { start_date: string; end_date: string; target_revenue: number }) => {
    const actual = (sales.data ?? []).filter((s) => s.sold_at >= g.start_date && s.sold_at <= g.end_date + "T23:59:59")
      .reduce((a, b) => a + Number(b.total_amount), 0);
    const pct = g.target_revenue > 0 ? Math.min(100, (actual / Number(g.target_revenue)) * 100) : 0;
    return { actual, pct };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Business Goals</h1>
          <p className="text-sm text-muted-foreground">Set 4-month, 6-month or annual revenue targets and track progress.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4"/>New goal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create revenue goal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Period</Label>
                  <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v as typeof form.period })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4m">4 months</SelectItem>
                      <SelectItem value="6m">6 months</SelectItem>
                      <SelectItem value="annual">Annual (12 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Target revenue (₦)</Label><Input type="number" value={form.target_revenue} onChange={(e) => setForm({ ...form, target_revenue: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="hero" onClick={() => create.mutate()} disabled={create.isPending || !form.target_revenue}>{create.isPending ? "Saving…" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(goals.data ?? []).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Target className="h-10 w-10 opacity-40"/><p>No goals yet. Create your first revenue target.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.data?.map((g) => {
            const { actual, pct } = progressFor(g);
            const remaining = Math.max(0, Number(g.target_revenue) - actual);
            return (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="font-display capitalize">{g.period === "annual" ? "Annual goal" : `${g.period} goal`}</CardTitle>
                    <p className="text-xs text-muted-foreground">{formatDate(g.start_date)} → {formatDate(g.end_date)}</p>
                  </div>
                  {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove.mutate(g.id)}><Trash2 className="h-4 w-4"/></Button>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Achieved</p>
                      <p className="font-display text-2xl font-bold">{formatNaira(actual)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Target</p>
                      <p className="font-semibold">{formatNaira(Number(g.target_revenue))}</p>
                    </div>
                  </div>
                  <Progress value={pct} className="h-3"/>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{pct.toFixed(1)}% complete</span>
                    <span className="font-medium">{formatNaira(remaining)} to go</span>
                  </div>
                  {g.notes && <p className="text-xs text-muted-foreground">{g.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GoalsRoute() {
  return <RoleGuard allow={["admin","manager"]}><GoalsPage /></RoleGuard>;
}