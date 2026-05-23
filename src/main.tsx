import { createRoot } from "react-dom/client";
import "./index.css";

window.onerror = (msg, src, line, col, err) => {
  document.body.innerHTML = `<div style="background:#111;color:#fff;padding:20px;font-family:monospace;min-height:100vh;word-break:break-word;"><h2 style="color:#ff4444;margin-bottom:12px">⚠️ JS Error</h2><div style="background:#222;padding:12px;border-radius:6px;margin-bottom:8px;font-size:13px">${msg}</div><div style="color:#aaa;font-size:11px">${src} line ${line}:${col}</div>${err?.stack ? `<pre style="margin-top:12px;font-size:10px;color:#ccc;overflow:auto">${err.stack}</pre>` : ""}</div>`;
  return true;
};

window.onunhandledrejection = (e) => {
  document.body.innerHTML = `<div style="background:#111;color:#fff;padding:20px;font-family:monospace;min-height:100vh;word-break:break-word;"><h2 style="color:#ff4444;margin-bottom:12px">⚠️ Promise Error</h2><div style="background:#222;padding:12px;border-radius:6px;font-size:13px">${e.reason?.message || String(e.reason)}</div>${e.reason?.stack ? `<pre style="margin-top:12px;font-size:10px;color:#ccc;overflow:auto">${e.reason.stack}</pre>` : ""}</div>`;
};

// Dynamically import App so errors inside it are caught by window.onerror
import("./App.tsx").then(({ default: App }) => {
  try {
    createRoot(document.getElementById("root")!).render(<App />);
  } catch (err: any) {
    document.body.innerHTML = `<div style="background:#111;color:#fff;padding:20px;font-family:monospace;min-height:100vh;word-break:break-word;"><h2 style="color:#ff4444;margin-bottom:12px">⚠️ React Mount Error</h2><div style="background:#222;padding:12px;border-radius:6px;font-size:13px">${err?.message || String(err)}</div>${err?.stack ? `<pre style="margin-top:12px;font-size:10px;color:#ccc;overflow:auto">${err.stack}</pre>` : ""}</div>`;
  }
}).catch((err) => {
  document.body.innerHTML = `<div style="background:#111;color:#fff;padding:20px;font-family:monospace;min-height:100vh;word-break:break-word;"><h2 style="color:#ff4444;margin-bottom:12px">⚠️ App Load Error</h2><div style="background:#222;padding:12px;border-radius:6px;font-size:13px">${err?.message || String(err)}</div>${err?.stack ? `<pre style="margin-top:12px;font-size:10px;color:#ccc;overflow:auto">${err.stack}</pre>` : ""}</div>`;
});
