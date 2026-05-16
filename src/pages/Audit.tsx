import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, History } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { RoleGuard } from "@/components/auth/RoleGuard";


function AuditPage() {
  const { hasRole } = useAuth();
  const allowed = hasRole("admin") || hasRole("manager");
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");

  const logs = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-orange-500"/>
        <h2 className="font-display text-2xl font-bold">Restricted</h2>
        <p className="text-sm text-muted-foreground">Audit log is for admins and managers only.</p>
      </div>
    );
  }

  const filtered = (logs.data ?? []).filter((l) => {
    if (tableFilter !== "all" && l.table_name !== tableFilter) return false;
    if (search && !`${l.user_email ?? ""} ${l.table_name} ${l.action}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tables = Array.from(new Set((logs.data ?? []).map((l) => l.table_name)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Every change to inventory, sales, expenses and stock — who, what, when.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2">
          <CardTitle className="mr-auto">Activity ({filtered.length})</CardTitle>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-xs"/>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><History className="h-10 w-10 opacity-40"/><p>No matching events.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Table</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(l.created_at)}</TableCell>
                      <TableCell className="text-sm">{l.user_email || <span className="text-muted-foreground">system</span>}</TableCell>
                      <TableCell><Badge variant="outline">{l.table_name}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={l.action === "DELETE" ? "destructive" : l.action === "INSERT" ? "default" : "secondary"}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.record_id?.slice(0, 8) ?? "—"}</TableCell>
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

export default function AuditPage() {
  return () => <RoleGuard allow={["admin","manager"]}><AuditPage /></RoleGuard>;
}
