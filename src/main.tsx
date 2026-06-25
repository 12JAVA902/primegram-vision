import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

window.addEventListener("error", (e) => console.error("[window.error]", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("[unhandledrejection]", e.reason));

const root = document.getElementById("root");

function renderEnvError() {
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;padding:2rem;color:#fff;background:#0a0a0a;font-family:system-ui,sans-serif">
      <h1 style="font-size:22px;margin-bottom:12px">App not configured</h1>
      <p style="opacity:.8;max-width:640px;line-height:1.5">
        This deployment is missing the required environment variables
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        Add them to your hosting provider (e.g. Vercel → Settings → Environment Variables)
        and redeploy.
      </p>
    </div>`;
}

async function boot() {
  if (!root) {
    document.body.innerHTML = '<pre style="color:#fff;padding:2rem">Missing #root element in index.html</pre>';
    return;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("[startup] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
    renderEnvError();
    return;
  }

  try {
    // Dynamic import: if anything inside App's module graph throws at init
    // (e.g. supabase createClient with bad env), we still render an error
    // instead of a blank page.
    const { default: App } = await import("./App.tsx");
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("[startup] Failed to load App:", err);
    root.innerHTML = `
      <div style="min-height:100vh;padding:2rem;color:#fff;background:#0a0a0a;font-family:system-ui,sans-serif">
        <h1 style="font-size:22px;margin-bottom:12px">Failed to start app</h1>
        <pre style="white-space:pre-wrap;background:rgba(255,255,255,.06);padding:16px;border-radius:8px;font-size:13px">${
          (err as Error)?.stack || (err as Error)?.message || String(err)
        }</pre>
      </div>`;
  }
}

boot();
