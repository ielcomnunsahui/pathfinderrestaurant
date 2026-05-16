import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/auth/RoleGuard";


const COLORS = ["hsl(var(--primary))", "#f97316", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1).toISOString().slice(0,10);
      const [sales, items, expenses, salaries, invItems] = await Promise.all([
        supabase.from("sales").select("total_amount, sold_at, payment_method").gte("sold_at", start.toISOString()),
        supabase.from("sale_items").select("item_id, item_name, quantity, subtotal, sale:sales!inner(sold_at)").gte("sale.sold_at", start.toISOString()),
        supabase.from("expenses").select("category, amount, expense_date").gte("expense_date", start.toISOString().slice(0,10)),
        supabase.from("staff_salaries").select("base_salary, bonus, deductions, status, month").gte("month", startMonth),
        supabase.from("inventory_items").select("id, cost_price"),
      ]);

      const itemCostMap = new Map<string, number>();
      (invItems.data ?? []).forEach((i) => itemCostMap.set(i.id, Number(i.cost_price)));

      // Daily series 30d
      const days: { day: string; sales: number; cogs: number; expenses: number; profit: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const key = d.toISOString().slice(0,10);
        const s = (sales.data ?? []).filter((x) => x.sold_at.slice(0,10) === key).reduce((a,b)=>a+Number(b.total_amount),0);
        const cogs = (items.data ?? []).filter((r: any) => r.sale.sold_at.slice(0,10) === key)
          .reduce((a, r: any) => a + (itemCostMap.get(r.item_id ?? "") ?? 0) * Number(r.quantity), 0);
        const ex = (expenses.data ?? []).filter((x) => (x.expense_date ?? "").slice(0,10) === key).reduce((a,b)=>a+Number(b.amount),0);
        days.push({ day: d.toLocaleDateString("en-NG",{month:"short",day:"numeric"}), sales: s, cogs, expenses: ex, profit: s - cogs - ex });
      }

      // Top items
      const itemMap = new Map<string, { qty: number; revenue: number }>();
      (items.data ?? []).forEach((r: any) => {
        const e = itemMap.get(r.item_name) ?? { qty: 0, revenue: 0 };
        e.qty += Number(r.quantity); e.revenue += Number(r.subtotal);
        itemMap.set(r.item_name, e);
      });
      const topItems = Array.from(itemMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
      // Payment mix
      const payMap = new Map<string, number>();
      (sales.data ?? []).forEach((r) => payMap.set(r.payment_method, (payMap.get(r.payment_method) ?? 0) + Number(r.total_amount)));
      const payMix = Array.from(payMap.entries()).map(([name, value]) => ({ name, value }));
      // Expense breakdown
      const expMap = new Map<string, number>();
      (expenses.data ?? []).forEach((r) => expMap.set(r.category, (expMap.get(r.category) ?? 0) + Number(r.amount)));
      const expMix = Array.from(expMap.entries()).map(([name, value]) => ({ name, value }));

      const totalRevenue = (sales.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const totalCogs = (items.data ?? []).reduce((a, r: any) => a + (itemCostMap.get(r.item_id ?? "") ?? 0) * Number(r.quantity), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      const totalSalaries = (salaries.data ?? []).reduce((s, r) => s + Number(r.base_salary) + Number(r.bonus) - Number(r.deductions), 0);
      const paidSalaries = (salaries.data ?? []).filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.base_salary) + Number(r.bonus) - Number(r.deductions), 0);

      const grossProfit = totalRevenue - totalCogs;
      const operatingProfit = grossProfit - totalExpenses;
      const netProfit = operatingProfit - paidSalaries;

      return { days, topItems, payMix, expMix, totalRevenue, totalCogs, totalExpenses, totalSalaries, paidSalaries, grossProfit, operatingProfit, netProfit };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days performance summary — including salaries.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold">{formatNaira(data?.totalRevenue ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Cost of goods</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold text-orange-500">{formatNaira(data?.totalCogs ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Operating expenses</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold text-orange-500">{formatNaira(data?.totalExpenses ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Salaries (paid)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold text-orange-500">{formatNaira(data?.paidSalaries ?? 0)}</div>}</CardContent></Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Gross Profit (Revenue − COGS)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold">{formatNaira(data?.grossProfit ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Operating Profit (− Expenses)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className="text-2xl font-bold">{formatNaira(data?.operatingProfit ?? 0)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Net Profit (− Paid Salaries)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24"/> : <div className={`text-2xl font-bold ${(data?.netProfit ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>{formatNaira(data?.netProfit ?? 0)}</div>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Revenue, Cost & Profit (30 days)</CardTitle></CardHeader>
        <CardContent className="h-[340px]">
          {isLoading ? <Skeleton className="h-full w-full"/> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                <XAxis dataKey="day" fontSize={11}/>
                <YAxis fontSize={11} tickFormatter={(v)=>`₦${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}/>
                <Legend />
                <Bar dataKey="sales" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]}/>
                <Bar dataKey="cogs" name="COGS" fill="#f97316" radius={[4,4,0,0]}/>
                <Bar dataKey="expenses" name="Expenses" fill="#ec4899" radius={[4,4,0,0]}/>
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top selling items</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? <Skeleton className="h-full w-full"/> : (data?.topItems.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                  <XAxis type="number" fontSize={11} tickFormatter={(v)=>`₦${(v/1000).toFixed(0)}k`}/>
                  <YAxis type="category" dataKey="name" fontSize={11} width={120}/>
                  <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}/>
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense breakdown</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? <Skeleton className="h-full w-full"/> : (data?.expMix.length === 0 ? <p className="text-sm text-muted-foreground">No expenses yet.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.expMix} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name}>
                    {data?.expMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}/>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return () => <RoleGuard allow={["admin","manager"]}><ReportsPage /></RoleGuard>;
}
