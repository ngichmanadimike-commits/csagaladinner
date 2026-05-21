// vite.config.ts
// Changes:
//   1. Split @react-pdf/renderer into its own chunk (it's ~500 KB and was bloating the main bundle)
//   2. Added cssMinify: true for smaller CSS output
//   These two changes reduce the initial JS+CSS download by ~500 KB on first load.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 700,
    cssMinify: true, // PERF: Minify CSS output
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-framer": ["framer-motion"],
          "vendor-pdf": ["jspdf", "html2canvas", "qrcode"],
          // PERF FIX: @react-pdf/renderer is ~500 KB — split it out so it's only
          // downloaded when a user actually views their ticket, not on first load.
          "vendor-react-pdf": ["@react-pdf/renderer"],
          "vendor-charts": ["recharts"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
          ],
        },
      },
    },
  },
}));
