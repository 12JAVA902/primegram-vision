import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Surface missing env vars (the #1 cause of a blank deploy)
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "[startup] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
    "Set these in your Vercel project (Settings → Environment Variables) and redeploy."
  );
}

window.addEventListener("error", (e) => console.error("[window.error]", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("[unhandledrejection]", e.reason));

const root = document.getElementById("root");
if (!root) {
  document.body.innerHTML = '<pre style="color:#fff;padding:2rem">Missing #root element in index.html</pre>';
} else {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
