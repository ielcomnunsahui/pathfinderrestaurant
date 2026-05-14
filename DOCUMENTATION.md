# P.R.I.S.M — Documentation

This document covers architecture, roles, database, features and deployment.

---

## 1. Architecture

```
Browser (React + TanStack Router)
   │
   ├── @supabase/supabase-js  → Postgres (RLS), Auth, Realtime, Storage
   │
   └── supabase.functions.invoke("admin-users")
                                  │
                                  └── Supabase Edge Function (Deno)
                                          │
                                          └── service-role admin client
```

- All everyday reads/writes go directly from the browser to Supabase under RLS as the signed-in user.
- Privileged admin-only operations (create user, change role, deactivate) go through the **`admin-users` edge function** which verifies the caller is admin before using the service-role key.

---

## 2. Roles & access

Roles live in `public.user_roles` with an `app_role` enum: `admin`, `manager`, `staff`. Roles are checked with the security-definer function `public.has_role(uid, role)` to avoid recursive RLS.

| Capability                              | Admin | Manager | Staff |
| --------------------------------------- | :---: | :-----: | :---: |
| View dashboard / sales / inventory      |   ✓   |    ✓    |   ✓   |
| Add / edit / delete inventory items     |   —   |    ✓    |   —   |
| Manage categories, suppliers            |   ✓   |    ✓    |   —   |
| Record sales, expenses                  |   ✓   |    ✓    |   ✓   |
| Delete sales / expenses                 |   ✓   |    ✓    |   —   |
| View P&L reports & analytics            |   ✓   |    ✓    |   ✓   |
| Set goals, generate payroll, mark paid  |   ✓   |    —    |   —   |
| Create users / change roles / deactivate|   ✓   |    —    |   —   |
| Receive low-stock alerts                |   ✓   |    ✓    |   —   |

A bootstrap rule in `handle_new_user()` makes the very first signup (or `ehsawwerl@gmail.com`) an admin.

### Login routing

- `/login` — staff
- `/login/manager`
- `/login/admin`

After sign-in, `useAuth` redirects each role to its dashboard. RoleGuard then blocks unauthorized routes.

---

## 3. Database (public schema)

| Table              | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `profiles`         | User profile + `default_salary` + `is_active`               |
| `user_roles`       | (user_id, role) — source of truth for access                |
| `categories`       | Inventory categories                                        |
| `suppliers`        | Supplier directory                                          |
| `inventory_items`  | Stock + pricing + `pack_size`/`pack_cost`/`pack_unit`       |
| `purchase_orders`  | Restocks; trigger increases stock & updates cost_price      |
| `stock_movements`  | Append-only log of every stock change                       |
| `sales`            | Sale headers (customer, total, payment, date)               |
| `sale_items`       | Sale lines; trigger decrements `inventory_items.current_stock` |
| `expenses`         | Operating expenses                                          |
| `staff_salaries`   | Monthly payroll rows (base/bonus/deductions/status)         |
| `business_goals`   | Revenue targets per period                                  |
| `audit_logs`       | Admin/manager-visible audit trail                           |

Triggers:

- `sale_item_decrement_stock` — auto-updates stock and writes a `stock_movements` row on every sale line.
- `po_increment_stock` — auto-restocks and updates `cost_price` on purchase orders.
- `log_audit` — writes `audit_logs` rows for INSERT/UPDATE/DELETE on tracked tables.

`inventory_items` has `REPLICA IDENTITY FULL` for realtime low-stock alerts.

---

## 4. Features

### Inventory
- Add / edit / delete items (manager only). Columns: Product, Category, Cost, Sell, Margin, In Stock, Sold, Min, Status, Actions.
- **Bulk pack pricing**: enter pack name, pack cost and units per pack — unit cost is auto-calculated (`pack_cost / pack_size`) and profit margin is shown live.
- Categories management dialog (manager).
- Print or export PDF.

### Inventory analytics (`/dashboard/inventory-analytics`)
Monthly / annual toggle. Charts: revenue, COGS, profit, stock value.

### Sales
Cart UI with auto stock decrement, receipts (PDF + print), customer, payment method.

### Expenses, Suppliers, Purchase Orders
Standard CRUD with role-based RLS.

### Salaries / payroll (`/dashboard/salaries`)
- Admin sets each staff's `default_salary` on their profile.
- "Generate month" bulk-inserts unpaid rows for active staff.
- Edit bonus/deductions, then **Mark paid** — flows into the P&L.

### Reports (`/dashboard/reports`)
- **Revenue** = Σ sales
- **COGS** = Σ (cost_price × quantity sold)
- **Gross Profit** = Revenue − COGS
- **Operating Profit** = Gross − Expenses
- **Net Profit** = Operating − Paid Salaries

### Real-time low-stock alerts
`use-low-stock-alerts` subscribes to `inventory_items` changes; managers/admins get a toast when `current_stock <= reorder_level`.

### Audit log (`/dashboard/audit`)
Read-only timeline of inserts/updates/deletes.

### Auth UX
- Friendly toast banner with **Re-login** when a server function returns 401.
- Global React `ErrorBoundary` so a crash never produces a blank page.
- Friendly client-side **404** with **Back to dashboard**.

---

## 5. Admin user management — Supabase Edge Function

File: `supabase/functions/admin-users/index.ts`. Single endpoint, action-routed body:

```ts
await supabase.functions.invoke("admin-users", {
  body: { action: "list" },
});

await supabase.functions.invoke("admin-users", {
  body: { action: "create", email, password, full_name, role },
});

await supabase.functions.invoke("admin-users", {
  body: { action: "set_role", user_id, role },
});

await supabase.functions.invoke("admin-users", {
  body: { action: "set_active", user_id, is_active },
});
```

Flow:

1. Reads bearer token from `Authorization` header.
2. Calls `auth.getUser()` against the user-scoped client to verify identity.
3. Checks `user_roles` for `admin` using the service-role client.
4. If admin → performs the requested admin action and returns JSON.
5. Otherwise → `401` / `403`.

This works in **both** the Lovable deployment and the Vercel static SPA build, because it does not depend on the TanStack Start server runtime.

---

## 6. Deployment

### Lovable (recommended)

Click **Publish** in the editor. Frontend + edge functions ship together.

### Vercel static SPA

```bash
bun run build:spa
```

`vercel.json` rewrites every path to `/index.html` so deep links work. The build aliases TanStack Start server modules to client-safe stubs in `src/spa-stubs/`. The admin user actions still work because they call the Supabase edge function directly.

> The static build cannot run the original TanStack `createServerFn` admin functions — that is exactly why those have been moved to the `admin-users` edge function.

---

## 7. Project layout

```
src/
  components/
    auth/            SignInPage, RoleGuard
    dashboard/       AppSidebar
    landing/         marketing site
    ui/              shadcn primitives
    ErrorBoundary.tsx
  hooks/
    use-auth.tsx
    use-low-stock-alerts.tsx
  integrations/supabase/
    client.ts            (browser)
    client.server.ts     (service-role, server only)
    auth-middleware.ts   (TanStack server fn middleware)
    types.ts             (generated)
  lib/
    admin-users.functions.ts   (legacy server-fn variant — kept for Lovable runtime)
    pdf.ts, format.ts, error-capture.ts, error-page.ts
  routes/                (TanStack file-based routes)
  spa-stubs/             (client stubs for TanStack Start in SPA build)
  main.tsx, router.tsx, server.ts, start.ts
supabase/
  functions/admin-users/index.ts
  migrations/*.sql
  config.toml
public/
  favicon.png, favicon.ico, apple-touch-icon.png
  pathfinder-icon-192.png, pathfinder-icon-512.png
  manifest.webmanifest
```

---

## 8. Environment variables

| Variable                          | Where           | Purpose                           |
| --------------------------------- | --------------- | --------------------------------- |
| `VITE_SUPABASE_URL`               | client + server | Supabase project URL              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | client + server | Anon/publishable key              |
| `VITE_SUPABASE_PROJECT_ID`        | client + server | Project ref                       |
| `SUPABASE_SERVICE_ROLE_KEY`       | edge function   | Privileged admin operations       |
| `LOVABLE_API_KEY`                 | server          | Lovable AI Gateway (if used)      |

All are auto-provisioned by Lovable Cloud.

---

## 9. License

MIT — see [LICENSE](./LICENSE).
