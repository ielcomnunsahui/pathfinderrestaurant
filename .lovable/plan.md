# P.R.I.S.M — Production Feature Expansion

This is a large scope. I'll deliver it in **6 sequenced phases**, each shippable on its own. After you approve I'll start at Phase 1 and work through them. If you want a different order or want to drop anything, tell me before approving.

---

## Phase 1 — Database & Audit Log (foundation)

New tables + triggers via migration:

- `audit_logs` — `id, user_id, user_email, table_name, record_id, action (INSERT/UPDATE/DELETE), old_data jsonb, new_data jsonb, created_at`. RLS: admins read all; managers read all; staff read own.
- Postgres trigger function `log_audit()` attached to `inventory_items`, `sales`, `sale_items`, `expenses`, `stock_movements` for INSERT/UPDATE/DELETE.
- `staff_salaries` — `id, user_id, month (date), base_salary, bonus, deductions, status (paid/unpaid), paid_at, paid_by, notes`. RLS: admin write, all auth read.
- `business_goals` — `id, period (4m/6m/annual), start_date, end_date, target_revenue, notes, created_by`. RLS: admin write, auth read.
- Add `is_active boolean default true` to `profiles` for deactivation.
- Trigger on `sales` insert that decrements `inventory_items.current_stock` and writes a `stock_movements` row (replaces current client-side decrement → race-safe).
- New `purchase_orders` table (lightweight: `id, item_id, quantity, unit_cost, supplier_id, received_at, user_id`) with trigger that increments stock + logs movement.

## Phase 2 — Auth: Forgot/Reset Password + Admin User Management

- `/forgot-password` — email entry, calls `supabase.auth.resetPasswordForEmail` with redirect to `/reset-password`.
- `/reset-password` — public route, detects recovery hash, calls `updateUser({ password })`.
- `/dashboard/users` (admin only) — list profiles + roles, invite (signup link / admin-create via edge function using service role), change role, toggle `is_active`, view audit trail per user.
- Branded auth email templates via Lovable's auth email scaffolder.

## Phase 3 — Inventory + Sales Integration

- `/dashboard/inventory` — confirm manager+admin full CRUD (already wired); add **delete**, **bulk restock** dialog (creates `purchase_orders` row → trigger updates stock).
- `/dashboard/sales` — allow editing line-item unit price at point of sale (manager+admin); rely on DB trigger for stock decrement; show low-stock warning when item near reorder.
- Stock movement history view per item (drawer).

## Phase 4 — Salary, Goals & Analytics

- `/dashboard/salaries` — table of staff × months, mark paid/unpaid, total payroll for selected month.
- `/dashboard/goals` — create 4/6/12-month revenue goals, show progress bar vs actual sales, ETA.
- `/dashboard/reports` enhancements:
  - Most profitable item (sum(qty × (unit_price − cost_price)))
  - Most sold item (sum(qty))
  - Monthly income, expenses, salaries, **gross profit**, **net profit**, gain/loss trend (12-month bar+line combo).
- `/dashboard/audit` — admin-only audit log viewer with filters (user, table, action, date range).

## Phase 5 — PDF / Print Reports

- Use `jspdf` + `jspdf-autotable` (works in browser, no native deps).
- "Print" + "Download PDF" buttons on Sales, Inventory, Expenses, Salary, P&L statement pages.
- Print-friendly CSS via `@media print`.

## Phase 6 — PWA (last, lowest risk)

⚠️ Note from platform guidance: PWA service workers can interfere with the Lovable preview iframe. I'll configure carefully:

- `vite-plugin-pwa` with `devOptions.enabled: false` (active only in published build).
- Registration guarded against iframe + preview hosts.
- `manifest.webmanifest` with PRISM icons, `display: standalone`.
- `NetworkFirst` for HTML, `StaleWhileRevalidate` for assets.
- Custom install prompt component using `beforeinstallprompt` event.
- Offline page fallback.
- Offline read of cached dashboard; mutations require online (toast on offline write attempt).

---

## Technical notes

- All triggers run as `SECURITY DEFINER` with locked `search_path`.
- Audit log uses `auth.uid()` for actor; service-role webhook writes record `user_id = NULL` with system marker.
- Admin user creation uses a TanStack Start `createServerFn` with `supabaseAdmin.auth.admin.createUser` (service-role) — never exposed client-side.
- All new tables get RLS + indexes on (`user_id`, `created_at`) and foreign-key columns.
- PDF generation runs client-side from already-loaded React Query data — no extra API surface.

---

## Deliverable order if approved

1. Migration (Phase 1) — I'll send the SQL for your approval.
2. Auth pages + admin users (Phase 2).
3. Inventory/sales sync + edits (Phase 3).
4. Salary, goals, expanded analytics, audit viewer (Phase 4).
5. PDF/print (Phase 5).
6. PWA (Phase 6).

Reply **"go"** to start with Phase 1, or tell me to reorder/drop phases.