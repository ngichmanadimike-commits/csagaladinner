import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "@/components/ErrorBoundary";

// ─── Auto-recover from stale chunk errors after a new deployment ──────────────
// When Vite deploys a new build, old chunk hashes disappear from the server.
// Browsers with a cached index.html try to load the old chunks → crash.
// This listener detects that specific error and does ONE automatic hard-reload
// to fetch the fresh HTML + new chunks, preventing the "Application Crashed" screen.
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[vite] Stale chunk detected — reloading for latest build…", event);
  // Guard: only auto-reload once per session to avoid infinite reload loops
  if (!sessionStorage.getItem("chunk_reload")) {
    sessionStorage.setItem("chunk_reload", "1");
    window.location.reload();
  }
});

// Clear the guard on a successful load so future deploys also auto-recover
window.addEventListener("load", () => {
  sessionStorage.removeItem("chunk_reload");
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
