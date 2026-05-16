import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Index from "@/pages/Index";
import AccessDenied from "@/pages/AccessDenied";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import LoginStaff from "@/pages/LoginStaff";
import LoginAdmin from "@/pages/LoginAdmin";
import LoginManager from "@/pages/LoginManager";
import DashboardLayout from "@/pages/DashboardLayout";
import DashboardIndex from "@/pages/DashboardIndex";
import Sales from "@/pages/Sales";
import Inventory from "@/pages/Inventory";
import InventoryAnalytics from "@/pages/InventoryAnalytics";
import Expenses from "@/pages/Expenses";
import Salaries from "@/pages/Salaries";
import Suppliers from "@/pages/Suppliers";
import Reports from "@/pages/Reports";
import Goals from "@/pages/Goals";
import Audit from "@/pages/Audit";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginStaff />} />
                <Route path="/login/admin" element={<LoginAdmin />} />
                <Route path="/login/manager" element={<LoginManager />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardIndex />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="inventory-analytics" element={<InventoryAnalytics />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="salaries" element={<Salaries />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="goals" element={<Goals />} />
                  <Route path="audit" element={<Audit />} />
                  <Route path="users" element={<Users />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
