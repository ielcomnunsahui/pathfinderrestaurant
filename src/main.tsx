import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Apply persisted theme before paint
try {
  const stored = localStorage.getItem("prism-theme");
  const theme = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  if (theme === "dark") document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = theme;
} catch { /* ignore */ }

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
