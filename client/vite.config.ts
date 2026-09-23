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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-table", "axios", "zustand"],
          "vendor-ui": ["framer-motion", "lucide-react", "sonner"],
          "vendor-i18n": ["i18next", "react-i18next"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
