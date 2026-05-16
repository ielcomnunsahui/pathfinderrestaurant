import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


function SettingsPage() {
  const { user, roles } = useAuth();
  const [form, setForm] = useState({ full_name: "", restaurant_name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setForm({ full_name: data.full_name ?? "", restaurant_name: data.restaurant_name ?? "Pathfinder", phone: data.phone ?? "" });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and workspace preferences.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled/></div>
            <div className="space-y-2"><Label>Role</Label><div className="flex gap-2 pt-1">{roles.map((r) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}</div></div>
            <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})}/></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}/></div>
            <div className="space-y-2 sm:col-span-2"><Label>Restaurant name</Label><Input value={form.restaurant_name} onChange={(e) => setForm({...form, restaurant_name: e.target.value})}/></div>
          </div>
          <Button variant="hero" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
