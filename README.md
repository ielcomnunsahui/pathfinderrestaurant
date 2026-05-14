# P.R.I.S.M — Pathfinder Restaurant Performance & Inventory System Manager

Smarter operations. Clearer profits.

P.R.I.S.M is a full restaurant operations platform for Pathfinder Restaurant. It tracks sales, inventory (with bulk/pack auto-pricing), expenses, salaries, suppliers and goals, and turns them into real-time profit & loss insight for managers and admins.

## Highlights

- 🔐 Role-based access — `admin`, `manager`, `staff` (RLS enforced)
- 📦 Inventory with bulk pack pricing & live profit margin
- 🧾 Sales with auto stock decrement & receipts (PDF/print)
- 💸 Expenses, suppliers and purchase orders
- 👥 Staff payroll: monthly bulk-generate + mark paid
- 📊 P&L reports — revenue, COGS, gross/operating/net profit
- 🚨 Real-time low-stock alerts for managers
- 📈 Inventory analytics (monthly / annual)
- 🛡️ Audit log of all critical changes
- 🌗 Light/dark theme, PWA, installable

## Tech stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind v4
- **Routing**: TanStack Router (file-based) + TanStack Start
- **Data**: TanStack Query, Supabase JS
- **UI**: shadcn/ui, lucide-react, sonner toasts, recharts
- **Backend**: Lovable Cloud (managed Supabase) — Postgres + Auth + Realtime + Edge Functions

## Quick start

```bash
bun install
bun run dev
```

The app expects these env vars (auto-provided by Lovable Cloud, see `.env`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

## Default admin

```
Email:    adminpathfinderrestaurant@gmail.com
Password: Admin@2026
```

## Deployment

Two supported flows:

1. **Lovable** — click **Publish**. Frontend + edge functions deploy as one unit.
2. **Vercel (static SPA)** — `bun run build:spa` produces `dist-spa/`. `vercel.json` already sets the SPA fallback. Admin user-management runs via the `admin-users` Supabase Edge Function so it works on Vercel too.

## Project structure

```
src/
  routes/                TanStack file-based routes
  components/            UI + dashboard components
  hooks/                 use-auth, use-low-stock-alerts, ...
  integrations/supabase/ generated client + types
  lib/                   helpers, server functions, pdf, format
supabase/
  functions/admin-users  edge function for admin user mgmt
  migrations/            SQL migrations
```

## License

[MIT](./LICENSE) © Pathfinder Restaurant / SAPHIX DESIGN AGENCY

See [DOCUMENTATION.md](./DOCUMENTATION.md) for architecture, roles, database and feature details.
