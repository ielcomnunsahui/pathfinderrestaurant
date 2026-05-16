import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/RoleGuard";


function SuppliersPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canWrite = hasRole("admin") || hasRole("manager");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });

  const list = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier added");
      setOpen(false);
      setForm({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage vendor and supplier directory.</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4" />Add Supplier</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1 -mr-1 flex-1">
                <div className="col-span-2 space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}/></div>
                <div className="space-y-2"><Label>Contact person</Label><Input value={form.contact_person} onChange={(e) => setForm({...form, contact_person: e.target.value})}/></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}/></div>
                <div className="col-span-2 space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}/></div>
                <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}/></div>
                <div className="col-span-2 space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}/></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="hero" onClick={() => create.mutate()} disabled={create.isPending || !form.name}>{create.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Suppliers ({list.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {list.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           (list.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 opacity-40" /><p>No suppliers yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.data?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contact_person || "—"}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
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

export default function SuppliersPage() {
  return () => <RoleGuard allow={["admin","manager"]}><SuppliersPage /></RoleGuard>;
}
