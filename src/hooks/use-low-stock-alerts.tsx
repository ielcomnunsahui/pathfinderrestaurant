import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";


/**
 * Realtime low-stock alerts for managers/admins.
 * Subscribes to inventory_items updates; when current_stock crosses below
 * reorder_level, fires a toast notification.
 */
export function useLowStockAlerts() {
  const { hasRole, loading } = useAuth();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!hasRole("manager") && !hasRole("admin")) return;

    // Initial sweep
    void (async () => {
      const { data } = await supabase.from("inventory_items").select("id,name,current_stock,reorder_level,unit").eq("is_active", true);
      (data ?? []).forEach((it) => {
        if (Number(it.current_stock) <= Number(it.reorder_level)) seenRef.current.add(it.id);
      });
    })();

    const channel = supabase
      .channel("low-stock-alerts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inventory_items" },
        (payload) => {
          const row = payload.new as { id: string; name: string; current_stock: number; reorder_level: number; unit: string };
          const isLow = Number(row.current_stock) <= Number(row.reorder_level);
          const wasLow = seenRef.current.has(row.id);
          if (isLow && !wasLow) {
            seenRef.current.add(row.id);
            toast.warning(`Low stock: ${row.name}`, {
              description: `Only ${Number(row.current_stock)} ${row.unit} left (min ${Number(row.reorder_level)}).`,
              duration: 8000,
              action: { label: "View", onClick: () => { window.location.href = "/dashboard/inventory"; } },
            });
          } else if (!isLow && wasLow) {
            seenRef.current.delete(row.id);
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [hasRole, loading]);
}

export function LowStockBoundary() {
  useLowStockAlerts();
  return null;
}

