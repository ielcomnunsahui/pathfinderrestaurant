import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/access-denied")({
  head: () => ({ meta: [{ title: "Access denied — P.R.I.S.M" }] }),
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="glass max-w-md rounded-3xl p-10 text-center shadow-elegant">
        <ShieldAlert className="mx-auto h-12 w-12 text-orange-500" />
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Access denied</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You don't have permission to view this page. If you believe this is a mistake, contact your administrator.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/dashboard"><Button variant="hero">Back to dashboard</Button></Link>
          <Link to="/"><Button variant="ghost">Home</Button></Link>
        </div>
      </div>
    </div>
  );
}
