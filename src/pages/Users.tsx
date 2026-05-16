import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";


type AdminUser = { id: string; full_name: string | null; email: string; role: "admin" | "manager" | "staff"; is_active: boolean; created_at: string };

async function callAdmin<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

function UsersPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "staff" as "admin" | "manager" | "staff" });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await callAdmin<{ users: AdminUser[] }>({ action: "list" })).users,
    enabled: hasRole("admin"),
  });
  const userRows: AdminUser[] = Array.isArray(users.data) ? users.data : [];

  const createMut = useMutation({
    mutationFn: () => callAdmin({ action: "create", ...form }),
    onSuccess: () => {
      toast.success("User created");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "staff" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "admin" | "manager" | "staff" }) => callAdmin({ action: "set_role", ...v }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const activeMut = useMutation({
    mutationFn: (v: { user_id: string; is_active: boolean }) => callAdmin({ action: "set_active", ...v }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasRole("admin")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-orange-500" />
        <h2 className="font-display text-2xl font-bold">Admins only</h2>
        <p className="text-sm text-muted-foreground">User management is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Create staff accounts, assign roles and deactivate access.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero" size="lg"><Plus className="mr-1 h-4 w-4"/>New user</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-1 -mr-1 flex-1">
              <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Temporary password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 chars" /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as typeof form.role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.email || form.password.length < 8 || !form.full_name}>
                {createMut.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Team ({userRows.length})</CardTitle></CardHeader>
        <CardContent>
          {users.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           userRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Users className="h-10 w-10 opacity-40"/><p>No users yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                <TableBody>
                  {userRows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as "admin" | "manager" | "staff" })}>
                          <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={u.is_active} onCheckedChange={(c) => activeMut.mutate({ user_id: u.id, is_active: c })} />
                          {u.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                        </div>
                      </TableCell>
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

export default function UsersPage() {
  return () => <RoleGuard allow={["admin"]}><UsersPage /></RoleGuard>;
}
