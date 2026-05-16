## Goal

Convert the project from **TanStack Start (SSR + file-based routing + server functions)** to a **plain Vite + React SPA with React Router v6**, deployable to both Vercel and Lovable hosting.

## Why

The Vercel production build keeps freezing on the login page. TanStack Start's SSR/server-fn/Cloudflare-Worker pipeline is the root of repeated production-only bugs. A plain Vite SPA eliminates SSR, the routeTree codegen, the server-fn RPC layer, and the Worker runtime — leaving a single client bundle that behaves identically in preview and on Vercel.

## New stack

- **Build**: Vite 7 + `@vitejs/plugin-react`
- **Routing**: `react-router-dom` v6 (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`, `useParams`)
- **Data**: `@tanstack/react-query` (kept)
- **Auth + DB**: `@supabase/supabase-js` directly from the client (kept)
- **Admin ops**: existing `admin-users` Supabase Edge Function (kept and reused)
- **Styling**: Tailwind v4 + shadcn (kept untouched)

## File changes

### Remove
- `src/routes/` (entire folder — all `createFileRoute` files)
- `src/routeTree.gen.ts`
- `src/router.tsx`, `src/server.ts`, `src/start.ts`
- `src/spa-stubs/` (no longer needed)
- `src/integrations/supabase/auth-middleware.ts`, `auth-attacher.ts`, `client.server.ts`
- `src/lib/admin-users.functions.ts` (replaced by direct edge-function fetch)
- `vite.spa.config.ts`, `wrangler.jsonc`
- `dist-spa/` (stale build output)
- `public/sw.js` (no longer needed)

### Create
- `src/App.tsx` — `BrowserRouter` + `<Routes>` table mapping every old route file to a page component
- `src/pages/*.tsx` — one file per former route (Index, SignIn, AdminLogin, ManagerLogin, ForgotPassword, ResetPassword, AccessDenied, Dashboard layout, Dashboard.* children, NotFound)
- `src/lib/admin-users.ts` — thin `fetch()` wrapper around the `admin-users` edge function (uses the user's Supabase session token)

### Rewrite
- `src/main.tsx` — mount `<App />` with `BrowserRouter`, `QueryClientProvider`, `ThemeProvider`, `AuthProvider`, `Toaster`, `ErrorBoundary`
- `index.html` — add SEO meta tags, fonts, manifest (moved out of `__root.tsx`'s `head()`)
- `vite.config.ts` — drop `@lovable.dev/vite-tanstack-config`, use plain `defineConfig` with `react()`, `tailwindcss()`, `@` alias, dev server port
- `vercel.json` — minimal SPA rewrite of all paths to `/index.html`
- `package.json` — remove `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`, `@cloudflare/vite-plugin`, `@lovable.dev/vite-tanstack-config`; add `react-router-dom`, `@vitejs/plugin-react`
- `tsconfig.json` — drop TanStack Start references
- `src/hooks/use-auth.tsx` — replace any `useNavigate` from `@tanstack/react-router` with `react-router-dom` equivalent; remove server-fn calls
- `src/components/auth/RoleGuard.tsx` — same router import swap
- All UI components currently importing `Link`/`useNavigate` from `@tanstack/react-router` → `react-router-dom`

### Keep as-is
- `src/components/ui/*` (shadcn)
- `src/components/landing/*`, `src/components/dashboard/*`, `src/components/brand/*`, `src/components/theme/*`, `src/components/pwa/*`
- `src/integrations/supabase/client.ts`, `types.ts`
- `src/hooks/use-low-stock-alerts.tsx`, `use-mobile.tsx`
- `src/lib/format.ts`, `pdf.ts`, `utils.ts`, `error-page.ts`, `error-capture.ts`
- `src/styles.css`
- `supabase/` (migrations + `admin-users` edge function)

## Routing map (React Router v6)

```text
/                       → Index (landing)
/login                  → SignIn (general)
/login/admin            → AdminLogin
/login/manager          → ManagerLogin
/forgot-password        → ForgotPassword
/reset-password         → ResetPassword
/access-denied          → AccessDenied
/dashboard              → Dashboard layout (Outlet, RoleGuard wraps)
  /dashboard            → DashboardIndex
  /dashboard/sales      → Sales
  /dashboard/inventory  → Inventory
  /dashboard/inventory-analytics
  /dashboard/expenses
  /dashboard/salaries
  /dashboard/suppliers
  /dashboard/reports
  /dashboard/goals
  /dashboard/audit
  /dashboard/users
  /dashboard/settings
*                       → NotFound
```

Dashboard parent uses `<Outlet />` and is wrapped in `<RoleGuard>` to enforce auth.

## Server functions → Edge function

Only `getAdminUsers` / admin user management currently uses server functions. Replace with a client-side helper that calls the existing `supabase/functions/admin-users` edge function:

```ts
// src/lib/admin-users.ts
export async function callAdminUsers(action, payload) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  }).then(r => r.json())
}
```

The edge function already verifies the caller's JWT and admin role, so RLS-bypassing admin ops stay safely on the server.

## Deployment

- **Vercel**: `vercel.json` with a single `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. Build command `vite build`, output `dist`.
- **Lovable**: works out of the box once the project type is a plain Vite app; `.lovable/project.json` updated to drop the `tanstack_start_ts_*` template marker (will note that template metadata is informational only).

## Risks / acceptances

- **One-shot migration**: ~30 route files rewritten as page components. I'll preserve all UI/business logic verbatim — only the route shell, navigation imports, and data-fetching style change.
- **No SSR**: Initial HTML will no longer be pre-rendered. SEO meta tags move into `index.html` and per-page `document.title` updates via a small `useDocumentTitle` hook.
- **Type-safe links lost**: `<Link to="/foo">` from `react-router-dom` is a plain string. Acceptable trade-off.
- **Auto-generated `routeTree.gen.ts`** is deleted; no more codegen step.

## Execution order

1. Add `react-router-dom`, remove TanStack deps
2. Rewrite `vite.config.ts`, `vercel.json`, `index.html`, `main.tsx`
3. Move every `src/routes/*.tsx` → `src/pages/*.tsx`, swap router imports
4. Build `src/App.tsx` route table + dashboard layout
5. Replace `src/lib/admin-users.functions.ts` usage with edge-function client
6. Delete old TanStack files and stubs
7. Verify build passes; smoke-test login + dashboard nav in preview

After approval I'll execute all of this in one go.