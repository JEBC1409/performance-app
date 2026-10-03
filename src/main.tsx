import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { initCloudSync } from "./db/cloudSync";
import { applyUiPrefs } from "./lib/uiPrefs";
import { initAppConfig } from "./lib/appConfig";
import { claimServiceWorkerReload } from "./lib/swReload";
import "./styles/index.css";

initCloudSync();
// Before the first paint, so a saved accent never flashes red.
applyUiPrefs();
initAppConfig();

// clientsClaim + skipWaiting (vite.config.ts) make a new deploy's service
// worker take over immediately instead of waiting for every tab to close —
// but an already-open tab still needs to reload once to actually fetch the
// new build's HTML/JS. Without this, users keep running whatever bundle was
// loaded when they last opened the app, however old that is.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    // Rate-limited across reloads too: `reloaded` resets with every page load,
    // so on its own it can't stop a worker that keeps changing from looping.
    if (claimServiceWorkerReload()) window.location.reload();
  });
}

// Right after a deploy, a tab still running the previous build asks for lazy
// chunks (a screen's code) whose old hashed files are gone, and the screen
// never loads. Vite reports that; one guarded reload fetches the new build.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  if (claimServiceWorkerReload(Date.now(), "performance_preload_reload_at")) window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
