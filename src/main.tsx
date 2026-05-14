import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { getRouter } from "./router";
import "./styles.css";

// Apply persisted theme before paint to avoid a light-mode flash.
try {
  const stored = localStorage.getItem("prism-theme");
  const theme = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  if (theme === "dark") document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = theme;
} catch { /* ignore */ }

const router = getRouter();
const queryClient =
  (router.options.context as { queryClient?: QueryClient } | undefined)?.queryClient ?? new QueryClient();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);

// Register a basic service worker if present (PWA).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* no-op */ });
  });
}
