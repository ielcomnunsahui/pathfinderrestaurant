import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, ShieldCheck, UserCog, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrismLogo } from "@/components/brand/PrismLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

type Variant = "staff" | "admin" | "manager";

const META: Record<Variant, { title: string; subtitle: string; icon: React.ElementType; required?: "admin" | "manager" }> = {
  staff: { title: "Staff sign in", subtitle: "Use the account created for you by your administrator.", icon: Users },
  admin: { title: "Admin sign in", subtitle: "Restricted access for system administrators.", icon: ShieldCheck, required: "admin" },
  manager: { title: "Manager sign in", subtitle: "Restricted access for managers.", icon: UserCog, required: "manager" },
};

export function SignInPage({ variant }: { variant: Variant }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const m = META[variant];
  const Icon = m.icon;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      return toast.error(error?.message ?? "Sign in failed");
    }
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id);
    if (roleError) {
      await supabase.auth.signOut();
      setBusy(false);
      return toast.error("Could not verify your access role.");
    }
    const signedInRoles = (roleRows ?? []).map((r) => r.role as "admin" | "manager" | "staff");
    if (m.required) {
      if (!signedInRoles.includes(m.required)) {
        await supabase.auth.signOut();
        setBusy(false);
        return toast.error(`This portal is for ${m.required}s only.`);
      }
    }
    setBusy(false);
    toast.success("Welcome back");
    const staffOnly = signedInRoles.includes("staff") && !signedInRoles.includes("admin") && !signedInRoles.includes("manager");
    navigate(staffOnly ? "/dashboard/sales" : "/dashboard", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PrismLogo showText={false} />
          </div>
        </div>

        <div className="auth-panel-enter mt-12 glass rounded-3xl p-8 shadow-elegant">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Pathfinder · P.R.I.S.M</p>
              <h1 className="font-display text-2xl font-bold tracking-tight">{m.title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{m.subtitle}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pathfinder.ng" className="h-11 pl-10" autoComplete="email" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pl-10" autoComplete="current-password" required minLength={8} />
              </div>
            </div>
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Continue"}
            </Button>
            <p className="text-center text-xs">
              <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Forgot your password?</Link>
            </p>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground space-y-1">
            <p>Need a different portal?</p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {variant !== "staff" && <Link to="/login" className="hover:text-primary">Staff</Link>}
              {variant !== "manager" && <Link to="/login/manager" className="hover:text-primary">Manager</Link>}
              {variant !== "admin" && <Link to="/login/admin" className="hover:text-primary">Admin</Link>}
            </div>
            <p className="pt-2 text-[11px]">Accounts are created by your administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
