import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure DaisyUI orbit theme is applied
document.documentElement.setAttribute('data-theme', 'orbit');

// Prevent stale UI in preview/dev by removing any previously-registered service worker caches.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  // Best-effort cache clear
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
