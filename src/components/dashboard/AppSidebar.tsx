import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Receipt, BarChart3, Users, LogOut, Settings, Wallet, Target, History, UserCog, Truck } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { PrismLogo } from "@/components/brand/PrismLogo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useLocation().pathname;
  const { signOut, user, roles, loading, hasRole } = useAuth();

  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const isStaffOnly = !loading && !isAdmin && !isManager;

  const ops = isStaffOnly
    ? [
        { title: "Sales", url: "/dashboard/sales", icon: ShoppingCart },
        { title: "Inventory", url: "/dashboard/inventory", icon: Package },
        { title: "Expenses", url: "/dashboard/expenses", icon: Receipt },
      ]
    : [
        { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
        { title: "Sales", url: "/dashboard/sales", icon: ShoppingCart },
        { title: "Inventory", url: "/dashboard/inventory", icon: Package },
        { title: "Expenses", url: "/dashboard/expenses", icon: Receipt },
        { title: "Suppliers", url: "/dashboard/suppliers", icon: Truck },
      ];
  const finance = isStaffOnly
    ? []
    : [
        { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
        ...(isAdmin ? [{ title: "Salaries", url: "/dashboard/salaries", icon: Wallet }] : []),
        { title: "Goals", url: "/dashboard/goals", icon: Target },
      ];
  const admin = isStaffOnly
    ? []
    : [
        ...(isAdmin || isManager ? [{ title: "Audit Log", url: "/dashboard/audit", icon: History }] : []),
        ...(isAdmin ? [{ title: "Users & Roles", url: "/dashboard/users", icon: UserCog }] : []),
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
      ];

  const renderGroup = (label: string, items: typeof ops) => (
    items.length === 0 ? null :
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => {
            const active = it.url === "/dashboard" ? path === it.url : path.startsWith(it.url);
            return (
              <SidebarMenuItem key={it.url}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link to={it.url} className="flex items-center gap-2">
                    <it.icon className="h-4 w-4" />
                    {!collapsed && <span>{it.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-4">
        {collapsed ? <PrismLogo showText={false} /> : <PrismLogo />}
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operations", ops)}
        {renderGroup("Finance", finance)}
        {renderGroup("Admin", admin)}
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        {!collapsed && user && (
          <div className="mb-2 truncate text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{user.email}</div>
            <div className="capitalize">{roles[0] ?? "loading"}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2"
          onClick={async () => { await signOut(); toast.success("Signed out"); window.location.href = "/login"; }}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
