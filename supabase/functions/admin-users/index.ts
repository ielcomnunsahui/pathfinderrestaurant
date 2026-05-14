// Admin user management edge function.
// Replaces TanStack server functions so the static SPA build (Vercel) works.
// Verifies the caller is an authenticated admin, then performs privileged
// operations using the Supabase service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === "list") {
      const [{ data: profiles }, { data: roles }, { data: authUsers }] = await Promise.all([
        admin.from("profiles").select("*").order("created_at", { ascending: false }),
        admin.from("user_roles").select("user_id, role"),
        admin.auth.admin.listUsers({ perPage: 200 }),
      ]);
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      const emailMap = new Map<string, string>();
      (authUsers?.users ?? []).forEach((u: any) => emailMap.set(u.id, u.email ?? ""));
      const users = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: emailMap.get(p.id) ?? "",
        role: roleMap.get(p.id) ?? "staff",
        is_active: p.is_active,
        created_at: p.created_at,
      }));
      return json({ users });
    }

    if (action === "create") {
      const { email, password, full_name, role } = body as any;
      if (!email || !password || password.length < 8 || !full_name || !["admin","manager","staff"].includes(role)) {
        return json({ error: "Invalid input" }, 400);
      }
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (error) return json({ error: error.message }, 400);
      if (!created.user) return json({ error: "User not created" }, 500);
      if (role !== "staff") {
        await admin.from("user_roles").delete().eq("user_id", created.user.id);
        await admin.from("user_roles").insert({ user_id: created.user.id, role });
      }
      return json({ id: created.user.id });
    }

    if (action === "set_role") {
      const { user_id, role } = body as any;
      if (!user_id || !["admin","manager","staff"].includes(role)) return json({ error: "Invalid input" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await admin.from("user_roles").insert({ user_id, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_active") {
      const { user_id, is_active } = body as any;
      if (!user_id || typeof is_active !== "boolean") return json({ error: "Invalid input" }, 400);
      const { error } = await admin.from("profiles").update({ is_active }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      await admin.auth.admin.updateUserById(user_id, {
        ban_duration: is_active ? "none" : "876000h",
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-users error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
