import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrismLogo } from "@/components/brand/PrismLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";


function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent. Check your email.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <div className="flex items-center gap-2"><ThemeToggle /><PrismLogo showText={false} /></div>
        </div>
        <div className="auth-panel-enter mt-12 glass rounded-3xl p-8 shadow-elegant">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Reset password</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Forgot your password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
          {sent ? (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
              Check <strong>{email}</strong> for the reset link. It expires in 1 hour.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10" placeholder="you@pathfinder.ng" />
                </div>
              </div>
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
