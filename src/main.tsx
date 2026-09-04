import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { initCloudSync } from "./db/cloudSync";
import "./styles/index.css";

initCloudSync();

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
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
