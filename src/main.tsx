import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

// ApplyA persisted theme before paint to avoid a light-mode flash.
try {
  const stored = localStorage.getItem("prism-theme");
  const theme = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  if (theme === "dark") document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = theme;
} catch { /* ignore */ }

const router = getRouter();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

// NOTE: QueryClientProvider is already rendered inside __root.tsx's RootComponent.
// Do NOT wrap RouterProvider in another QueryClientProvider here — duplicate
// providers cause cascading re-renders that freeze controlled inputs in production.
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
