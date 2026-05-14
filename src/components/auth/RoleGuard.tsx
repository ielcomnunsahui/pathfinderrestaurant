import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

type Role = "admin" | "manager" | "staff";

export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, roles, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  const ok = roles.some((r) => allow.includes(r));
  if (!ok) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}
