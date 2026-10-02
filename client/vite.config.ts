import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than app code: splitting them out
        // means a deploy only invalidates the small app chunk, and the browser
        // keeps the (long-cached) vendor chunks.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const groups: Record<string, string[]> = {
            "vendor-react": ["react", "react-dom", "react-router", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query", "axios", "zustand"],
            "vendor-table": ["@tanstack/react-table", "@tanstack/table-core"],
            "vendor-ui": ["lucide-react", "sonner"], "vendor-motion": ["framer-motion"],
            "vendor-i18n": ["i18next", "react-i18next"], "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          };
          return Object.entries(groups).find(([, packages]) => packages.some((pkg) => id.replace(/\\/g, "/").includes(`/node_modules/${pkg}/`)))?.[0];
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
