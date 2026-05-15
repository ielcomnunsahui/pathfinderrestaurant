import path from "node:path";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const spaStub = (file: string) => path.resolve(__dirname, "src/spa-stubs", file);

export default defineConfig({
  appType: "spa",
  base: "/",
  publicDir: "public",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: [
      { find: /^@tanstack\/react-start\/server$/, replacement: spaStub("tanstack-start-server.ts") },
      { find: /^@tanstack\/react-start$/, replacement: spaStub("tanstack-start.ts") },
      { find: path.resolve(__dirname, "src/integrations/supabase/client.server.ts"), replacement: spaStub("client-server.ts") },
      { find: path.resolve(__dirname, "src/integrations/supabase/auth-middleware.ts"), replacement: spaStub("auth-middleware.ts") },
    ],
  },
  build: {
    outDir: "dist-spa",
    emptyOutDir: true,
    sourcemap: false,
  },
});
