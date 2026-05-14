import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNaira, formatDateTime } from "@/lib/format";
import { TrendingUp, ShoppingCart, Package, AlertTriangle, Receipt, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function startOfDay(d = new Date()) { d = new Date(d); d.setHours(0,0,0,0); return d; }

function Overview() {
  const { hasRole, loading } = useAuth();
  const navigate = useNavigate();
  const canViewOverview = hasRole("admin") || hasRole("manager");
  const staffOnly = !loading && !canViewOverview;
  useEffect(() => {
    if (staffOnly) navigate({ to: "/dashboard/sales", replace: true });
  }, [staffOnly, navigate]);
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    enabled: canViewOverview,
    queryFn: async () => {
      const today = startOfDay().toISOString();
      const last7 = new Date(); last7.setDate(last7.getDate() - 6); last7.setHours(0,0,0,0);
      const [salesToday, salesAll, expensesAll, inventory, recent] = await Promise.all([
        supabase.from("sales").select("total_amount").gte("sold_at", today),
        supabase.from("sales").select("total_amount, sold_at").gte("sold_at", last7.toISOString()),
        supabase.from("expenses").select("amount, expense_date").gte("expense_date", last7.toISOString().slice(0,10)),
        supabase.from("inventory_items").select("id, name, current_stock, reorder_level, selling_price").eq("is_active", true),
        supabase.from("sales").select("id, total_amount, sold_at, customer_name, payment_method").order("sold_at", { ascending: false }).limit(6),
      ]);
      const todayTotal = (salesToday.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const weekTotal = (salesAll.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const expenseTotal = (expensesAll.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const lowStock = (inventory.data ?? []).filter((i) => Number(i.current_stock) <= Number(i.reorder_level));
      // 7-day series
      const days: { day: string; sales: number; expenses: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const key = d.toISOString().slice(0,10);
        const s = (salesAll.data ?? []).filter((x) => x.sold_at.slice(0,10) === key).reduce((a,b)=>a+Number(b.total_amount),0);
        const e = (expensesAll.data ?? []).filter((x) => x.expense_date === key).reduce((a,b)=>a+Number(b.amount),0);
        days.push({ day: d.toLocaleDateString("en-NG",{weekday:"short"}), sales: s, expenses: e });
      }
      return {
        todayTotal, weekTotal, expenseTotal, profit: weekTotal - expenseTotal,
        itemsCount: inventory.data?.length ?? 0, lowStock,
        recent: recent.data ?? [], series: days,
      };
    },
  });
  if (loading || staffOnly) {
    return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-32 w-full" /></div>;
  }

  const stats = [
    { label: "Today's Sales", value: formatNaira(data?.todayTotal ?? 0), icon: ShoppingCart, accent: "text-emerald-500" },
    { label: "7-Day Revenue", value: formatNaira(data?.weekTotal ?? 0), icon: TrendingUp, accent: "text-primary" },
    { label: "7-Day Expenses", value: formatNaira(data?.expenseTotal ?? 0), icon: Receipt, accent: "text-orange-500" },
    { label: "Net Profit (7d)", value: formatNaira(data?.profit ?? 0), icon: Wallet, accent: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Live operational snapshot for Pathfinder Restaurant.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.accent}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-24" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales vs Expenses (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series ?? []}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="url(#g1)" />
                  <Area type="monotone" dataKey="expenses" stroke="#f97316" fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32" /> : data?.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are above reorder level.</p>
            ) : (
              <ul className="space-y-2">
                {data?.lowStock.slice(0,6).map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{i.name}</span>
                    <Badge variant="destructive">{Number(i.current_stock)} left</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Sales</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : data?.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet. Record your first sale from the Sales page.</p>
          ) : (
            <div className="divide-y">
              {data?.recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{s.customer_name || "Walk-in"}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(s.sold_at)} · {s.payment_method}</div>
                  </div>
                  <div className="font-semibold">{formatNaira(Number(s.total_amount))}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
