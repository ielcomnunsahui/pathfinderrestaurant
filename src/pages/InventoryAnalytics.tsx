import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatNaira } from "@/lib/format";
import { ArrowLeft } from "lucide-react";


type Bucket = { key: string; label: string; revenue: number; cost: number; profit: number; units: number };

function InventoryAnalyticsPage() {
  const [scope, setScope] = useState<"monthly" | "annual">("monthly");
  const year = new Date().getFullYear();

  const q = useQuery({
    queryKey: ["inv-analytics", scope, year],
    queryFn: async () => {
      const start = scope === "monthly"
        ? new Date(year, new Date().getMonth(), 1).toISOString()
        : new Date(year, 0, 1).toISOString();
      const [{ data: items }, { data: rows }] = await Promise.all([
        supabase.from("inventory_items").select("id, name, cost_price, current_stock, reorder_level, unit, categories(name)"),
        supabase.from("sale_items").select("item_id, item_name, quantity, subtotal, sale:sales!inner(sold_at)").gte("sale.sold_at", start),
      ]);
      const itemMap = new Map<string, any>();
      (items ?? []).forEach((it) => itemMap.set(it.id, it));

      // Group by bucket (day if monthly, month if annual)
      const buckets = new Map<string, Bucket>();
      const ensureBucket = (k: string, label: string) => {
        if (!buckets.has(k)) buckets.set(k, { key: k, label, revenue: 0, cost: 0, profit: 0, units: 0 });
        return buckets.get(k)!;
      };

      if (scope === "monthly") {
        const daysInMonth = new Date(year, new Date().getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          ensureBucket(String(d).padStart(2, "0"), String(d));
        }
      } else {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        months.forEach((m, i) => ensureBucket(String(i).padStart(2, "0"), m));
      }

      // Per-item aggregate
      const perItem = new Map<string, { name: string; units: number; revenue: number; cost: number; profit: number }>();

      (rows ?? []).forEach((r: any) => {
        const dt = new Date(r.sale.sold_at);
        const key = scope === "monthly" ? String(dt.getDate()).padStart(2, "0") : String(dt.getMonth()).padStart(2, "0");
        const bucket = buckets.get(key);
        const inv = r.item_id ? itemMap.get(r.item_id) : null;
        const qty = Number(r.quantity);
        const revenue = Number(r.subtotal);
        const unitCost = inv ? Number(inv.cost_price) : 0;
        const cost = unitCost * qty;
        const profit = revenue - cost;
        if (bucket) { bucket.units += qty; bucket.revenue += revenue; bucket.cost += cost; bucket.profit += profit; }
        const k = r.item_name || "Unknown";
        const e = perItem.get(k) ?? { name: k, units: 0, revenue: 0, cost: 0, profit: 0 };
        e.units += qty; e.revenue += revenue; e.cost += cost; e.profit += profit;
        perItem.set(k, e);
      });

      const series = Array.from(buckets.values());
      const top = Array.from(perItem.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      const totals = series.reduce((a, b) => ({
        revenue: a.revenue + b.revenue,
        cost: a.cost + b.cost,
        profit: a.profit + b.profit,
        units: a.units + b.units,
      }), { revenue: 0, cost: 0, profit: 0, units: 0 });

      // Stock summary
      const stockValue = (items ?? []).reduce((a, i) => a + Number(i.current_stock) * Number(i.cost_price), 0);
      const lowStock = (items ?? []).filter((i) => Number(i.current_stock) <= Number(i.reorder_level)).length;

      return { series, top, totals, stockValue, lowStock, itemCount: items?.length ?? 0 };
    },
  });

  const title = scope === "monthly"
    ? `Inventory Analytics — ${new Date().toLocaleString("en-NG", { month: "long" })} ${year}`
    : `Inventory Analytics — ${year}`;

  const data = q.data;
  const isLoading = q.isLoading;

  const chartData = useMemo(() => data?.series ?? [], [data?.series]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/dashboard/inventory"><ArrowLeft className="mr-1 h-4 w-4"/>Back to inventory</Link></Button>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Movement, revenue, cost & profit per item.</p>
        </div>
        <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" />
          <TabsContent value="annual" />
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Units sold</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-20"/> : <div className="text-2xl font-bold">{data?.totals.units ?? 0}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold">{formatNaira(data?.totals.revenue ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Cost of goods</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold text-orange-500">{formatNaira(data?.totals.cost ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Gross profit</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold text-emerald-500">{formatNaira(data?.totals.profit ?? 0)}</div>}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Stock on hand value</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold">{formatNaira(data?.stockValue ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Low-stock items</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold text-orange-500">{data?.lowStock ?? 0}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active items</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{data?.itemCount ?? 0}</div>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue, Cost & Profit ({scope === "monthly" ? "by day" : "by month"})</CardTitle></CardHeader>
        <CardContent className="h-[340px]">
          {isLoading ? <Skeleton className="h-full w-full"/> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                <XAxis dataKey="label" fontSize={11}/>
                <YAxis fontSize={11} tickFormatter={(v)=>`₦${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}/>
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top items by revenue</CardTitle></CardHeader>
        <CardContent className="h-[360px]">
          {isLoading ? <Skeleton className="h-full w-full"/> : (data?.top.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                <XAxis type="number" fontSize={11} tickFormatter={(v)=>`₦${(v/1000).toFixed(0)}k`}/>
                <YAxis type="category" dataKey="name" fontSize={11} width={140}/>
                <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}/>
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]}/>
                <Bar dataKey="profit" fill="#10b981" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InventoryAnalyticsPage() {
  return () => <RoleGuard allow={["admin","manager"]}><InventoryAnalyticsPage /></RoleGuard>;
}
