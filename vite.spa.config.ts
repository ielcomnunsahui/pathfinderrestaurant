import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

// Standalone SPA build for Vercel static hosting.
// Stubs out TanStack Start server-only modules so the bundle is purely client-side.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: [
      { find: /^@tanstack\/react-start\/server$/, replacement: path.resolve(__dirname, "src/spa-stubs/tanstack-start-server.ts") },
      { find: /^@tanstack\/react-start$/, replacement: path.resolve(__dirname, "src/spa-stubs/tanstack-start.ts") },
      { find: path.resolve(__dirname, "src/integrations/supabase/client.server.ts"), replacement: path.resolve(__dirname, "src/spa-stubs/client-server.ts") },
      { find: path.resolve(__dirname, "src/integrations/supabase/auth-middleware.ts"), replacement: path.resolve(__dirname, "src/spa-stubs/auth-middleware.ts") },
    ],
  },
  build: {
    outDir: "dist-spa",
    emptyOutDir: true,
  },
});
